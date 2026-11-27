import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { env } from 'cloudflare:workers'
import { sql } from '@/lib/db/client'
import { verifyStripeSignature } from '@/lib/stripe/webhook-signature'
import { recordStripeTaxTransaction } from '@/lib/checkout/stripe-tax'
import { getOrderById, setOrderPrintfulOrderId } from '@/lib/db/orders'
import { submitPaidOrder } from '@/lib/printful/orders'
import { createSecureId } from '@/lib/crypto'
import { retrieveStripePaymentFinancials } from '@/lib/stripe/marketplace-payments'
import {
  allocateProcessingFee,
  calculateResellerProfitShare,
} from '@/lib/marketplace/profit-share'
import {
  getMarketplaceDisputeTransferError,
  MARKETPLACE_DISPUTE_TRANSFER_ERRORS,
} from '@/lib/marketplace/disputes'

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    console.error('[Webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')

  if (!signature) {
    console.error('[Webhook] Missing stripe-signature header')
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: any

  try {
    // Verify webhook signature
    event = await verifyStripeSignature(body, signature, env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        await handleCheckoutCompleted(session)
        break
      }

      case 'checkout.session.expired': {
        const session = event.data.object
        await handleCheckoutExpired(session)
        break
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object
        await handlePaymentIntentSucceeded(paymentIntent)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object
        await handlePaymentFailed(paymentIntent)
        break
      }

      case 'charge.refunded': {
        await handleChargeRefunded(event.data.object)
        break
      }

      case 'charge.dispute.created':
      case 'charge.dispute.updated':
      case 'charge.dispute.closed': {
        await handleChargeDispute(event.type, event.data.object)
        break
      }

      default:
        console.log('[Webhook] Unhandled event type:', event.type)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('[Webhook] Error processing event:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}

async function handleCheckoutCompleted(session: any) {
  console.log('[Webhook] Checkout completed:', session.id)

  try {
    const result = await sql<{ id: string }>`
      UPDATE orders
      SET status = 'confirmed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE stripe_session_id = ${session.id} AND status != 'confirmed'
      RETURNING id
    `

    if (result.rows[0]) await sendConfirmationEmail(result.rows[0].id)
  } catch (error) {
    console.error('[Webhook] Failed to update order:', error)
    throw error
  }
}

async function handlePaymentIntentSucceeded(paymentIntent: any) {
  const orderId = paymentIntent.metadata?.order_id
  if (typeof orderId !== 'string' || typeof paymentIntent.id !== 'string') {
    console.error('[Webhook] Successful PaymentIntent is missing order metadata:', paymentIntent.id)
    return
  }

  if (paymentIntent.metadata?.checkout_flow === 'marketplace') {
    await handleMarketplacePaymentIntentSucceeded(paymentIntent, orderId)
    return
  }

  if (!env.STRIPE_SECRET_KEY) {
    throw new Error('Stripe secret is required to record the completed charge.')
  }
  const financials = await retrieveStripePaymentFinancials(env.STRIPE_SECRET_KEY, paymentIntent.id)
  await sql`
    UPDATE orders
    SET stripe_charge_id = ${financials.chargeId},
      stripe_fee_minor = ${financials.feeMinor},
      stripe_fee_currency = ${financials.feeCurrency},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ${orderId} AND stripe_session_id = ${paymentIntent.id}
  `

  try {
    const result = await sql<{ id: string }>`
      UPDATE orders
      SET status = 'confirmed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ${orderId}
        AND stripe_session_id = ${paymentIntent.id}
        AND status != 'confirmed'
      RETURNING id
    `
    if (result.rows[0]) {
      console.log('[Webhook] Order confirmed:', result.rows[0].id)
      await sendConfirmationEmail(result.rows[0].id)
    }

    const riskState = await sql<{ refunded_minor: number; dispute_status: string }>`
      SELECT refunded_minor, dispute_status FROM orders WHERE id = ${orderId}
    `
    const orderRisk = riskState.rows[0]
    if (orderRisk && (orderRisk.refunded_minor > 0 || ['open', 'lost'].includes(orderRisk.dispute_status))) {
      console.warn('[Webhook] Fulfillment skipped for refunded or disputed order:', orderId)
      return
    }

    if (
      paymentIntent.metadata?.checkout_flow === 'printful_cost_plus' &&
      paymentIntent.metadata?.fulfillment_mode === 'automatic'
    ) {
      const shippingMethod = paymentIntent.metadata.shipping_rate_id
      const token = env.PRINTFUL_API_TOKEN
      if (typeof shippingMethod !== 'string' || !token) {
        throw new Error('Paid order is missing fulfillment configuration.')
      }

      const order = await getOrderById(orderId)
      if (!order || order.stripeSessionId !== paymentIntent.id) {
        throw new Error('Paid order could not be matched to its payment.')
      }

      const printfulOrderId = await submitPaidOrder(
        order,
        shippingMethod,
        token,
        env.PRINTFUL_STORE_ID,
      )
      await setOrderPrintfulOrderId(orderId, printfulOrderId)
      console.log('[Webhook] Fulfillment order submitted:', orderId, printfulOrderId)
    }

    if (paymentIntent.metadata?.checkout_flow === 'payment_element') {
      const calculationId = paymentIntent.metadata.tax_calculation_id
      if (typeof calculationId !== 'string' || !env.STRIPE_SECRET_KEY) {
        throw new Error('Stripe Tax calculation or secret is missing for the paid order.')
      }
      await recordStripeTaxTransaction(
        env.STRIPE_SECRET_KEY,
        calculationId,
        orderId,
        paymentIntent.id,
      )
    }
  } catch (error) {
    console.error('[Webhook] Failed to confirm PaymentIntent order:', error)
    throw error
  }
}

async function handleMarketplacePaymentIntentSucceeded(paymentIntent: any, orderId: string) {
  if (!env.STRIPE_SECRET_KEY || typeof paymentIntent.currency !== 'string' || typeof paymentIntent.amount !== 'number') {
    throw new Error('Marketplace payment is missing required payment details.')
  }
  const orderResult = await sql<{
    id: string
    status: string
    total_minor: number
    currency: string
    tax_calculation_id: string
    transfer_group: string
    referrer_user_id: string | null
    reseller_rate_bps: number | null
    refunded_minor: number
    dispute_status: string
  }>`
    SELECT id, status, total_minor, currency, tax_calculation_id, transfer_group,
      referrer_user_id, reseller_rate_bps, refunded_minor, dispute_status
    FROM marketplace_orders
    WHERE id = ${orderId} AND payment_intent_id = ${paymentIntent.id}
  `
  const order = orderResult.rows[0]
  if (
    !order ||
    order.total_minor !== paymentIntent.amount ||
    order.currency.toLowerCase() !== paymentIntent.currency.toLowerCase() ||
    order.transfer_group !== paymentIntent.transfer_group
  ) {
    throw new Error('Marketplace payment does not match its saved order.')
  }

  const financials = await retrieveStripePaymentFinancials(env.STRIPE_SECRET_KEY, paymentIntent.id)
  await sql`
    UPDATE marketplace_orders
    SET stripe_charge_id = ${financials.chargeId},
      stripe_fee_minor = ${financials.feeMinor},
      stripe_fee_currency = ${financials.feeCurrency},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ${orderId} AND payment_intent_id = ${paymentIntent.id}
  `

  if (order.status === 'pending') {
    await sql`
      UPDATE marketplace_orders
      SET status = 'paid', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ${orderId} AND payment_intent_id = ${paymentIntent.id} AND status = 'pending'
    `
    await sql`
      UPDATE marketplace_seller_orders
      SET status = 'paid', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE marketplace_order_id = ${orderId} AND status = 'awaiting_payment'
    `
  } else if (!['paid', 'partially_refunded', 'refunded'].includes(order.status)) {
    throw new Error(`Marketplace order cannot be confirmed from status "${order.status}".`)
  }

  const sellerOrders = await sql<{
    id: string
    seller_user_id: string
    tax_calculation_id: string
    subtotal_minor: number
    shipping_minor: number
    tax_minor: number
    commission_minor: number
  }>`
    SELECT id, seller_user_id, tax_calculation_id, subtotal_minor, shipping_minor,
      tax_minor, commission_minor
    FROM marketplace_seller_orders
    WHERE marketplace_order_id = ${orderId}
  `
  if (sellerOrders.rows.length === 0) {
    throw new Error('Marketplace payment has no seller orders to record tax against.')
  }
  const sellerGrossAmounts = sellerOrders.rows.map(
    (sellerOrder) => sellerOrder.subtotal_minor + sellerOrder.shipping_minor + sellerOrder.tax_minor,
  )
  const grossTotalMinor = sellerGrossAmounts.reduce((total, amount) => total + BigInt(amount), 0n)
  if (grossTotalMinor !== BigInt(order.total_minor)) {
    throw new Error('Marketplace seller totals do not reconcile to the paid order total.')
  }
  for (const sellerOrder of sellerOrders.rows) {
    await recordStripeTaxTransaction(
      env.STRIPE_SECRET_KEY,
      sellerOrder.tax_calculation_id,
      sellerOrder.id,
      paymentIntent.id,
      sellerOrder.id,
    )
  }

  if (
    order.referrer_user_id &&
    order.reseller_rate_bps != null &&
    order.refunded_minor === 0 &&
    ['none', 'won'].includes(order.dispute_status)
  ) {
    const feeCurrencyMatches = financials.feeCurrency === order.currency.toUpperCase()
    const feeShares = feeCurrencyMatches
      ? allocateProcessingFee(financials.feeMinor, order.total_minor, sellerGrossAmounts)
      : sellerOrders.rows.map(() => 0)
    let allocatedCommission = 0
    for (let index = 0; index < sellerOrders.rows.length; index += 1) {
      const sellerOrder = sellerOrders.rows[index]
      if (!sellerOrder) continue
      const share = calculateResellerProfitShare(
        sellerOrder.seller_user_id === order.referrer_user_id ? 0 : sellerOrder.commission_minor,
        feeCurrencyMatches ? feeShares[index] ?? 0 : sellerOrder.commission_minor,
        order.reseller_rate_bps,
      )
      const { profitBasisMinor, amountMinor } = share
      allocatedCommission += amountMinor
      await sql`
        INSERT INTO marketplace_seller_referral_attributions (
          id, marketplace_order_id, seller_order_id, reseller_user_id,
          rate_bps, profit_basis_minor, amount_minor, currency
        ) VALUES (
          ${createSecureId()}, ${orderId}, ${sellerOrder.id}, ${order.referrer_user_id},
          ${order.reseller_rate_bps}, ${profitBasisMinor}, ${amountMinor}, ${order.currency}
        )
        ON CONFLICT(seller_order_id, reseller_user_id) DO NOTHING
      `
    }
    await sql`
      UPDATE marketplace_orders
      SET reseller_commission_minor = ${allocatedCommission},
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ${orderId}
    `
    if (!feeCurrencyMatches) {
      console.warn(
        '[Webhook] Reseller contribution held at zero because Stripe fee currency differs from order currency:',
        orderId,
        financials.feeCurrency,
        order.currency,
      )
    }
  }
}

async function sendConfirmationEmail(orderId: string) {
  try {
    const { sendOrderConfirmationEmail } = await import('@/lib/email/send')
    const { getOrderById } = await import('@/lib/db/orders')
    const order = await getOrderById(orderId)
    if (order) await sendOrderConfirmationEmail(order)
  } catch (error) {
    console.error('[Webhook] Failed to send order confirmation email:', error)
  }
}

async function handleCheckoutExpired(session: any) {
  console.log('[Webhook] Checkout expired:', session.id)

  try {
    await sql`
      UPDATE orders
      SET status = 'failed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE stripe_session_id = ${session.id} AND status = 'pending'
    `
  } catch (error) {
    console.error('[Webhook] Failed to mark order as expired:', error)
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  console.log('[Webhook] Payment failed:', paymentIntent.id)

  try {
    // Mark any orders associated with this payment as failed
    await sql`
      UPDATE orders
      SET status = 'failed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE stripe_session_id = ${paymentIntent.id} AND status = 'pending'
    `
  } catch (error) {
    console.error('[Webhook] Failed to mark payment as failed:', error)
  }
}

async function handleChargeRefunded(charge: any) {
  const chargeId = typeof charge.id === 'string' ? charge.id : null
  const paymentIntentId = typeof charge.payment_intent === 'string' ? charge.payment_intent : null
  if (
    !chargeId ||
    !paymentIntentId ||
    typeof charge.amount_refunded !== 'number' ||
    !Number.isSafeInteger(charge.amount_refunded)
  ) {
    throw new Error('Refund event is missing its charge or refunded amount.')
  }

  await sql`
    UPDATE marketplace_orders
    SET refunded_minor = ${charge.amount_refunded},
      status = CASE
        WHEN ${charge.amount_refunded} >= total_minor THEN 'refunded'
        ELSE 'partially_refunded'
      END,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE (stripe_charge_id = ${chargeId} OR payment_intent_id = ${paymentIntentId})
      AND status IN ('pending', 'paid', 'partially_refunded', 'refunded')
  `
  await sql`
    UPDATE marketplace_seller_referral_attributions
    SET status = CASE WHEN stripe_transfer_id IS NULL THEN 'canceled' ELSE status END,
      transfer_error = CASE WHEN stripe_transfer_id IS NULL
        THEN 'Refund recorded; payout blocked pending review.'
        ELSE 'Refund issued after transfer; manual recovery review required.' END,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE marketplace_order_id IN (
      SELECT id FROM marketplace_orders
      WHERE stripe_charge_id = ${chargeId} OR payment_intent_id = ${paymentIntentId}
    )
  `
  await sql`
    UPDATE marketplace_seller_orders
    SET transfer_error = CASE WHEN stripe_transfer_id IS NULL
      THEN 'Refund recorded; payout blocked pending review.'
      ELSE 'Refund issued after transfer; manual recovery review required.' END,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE marketplace_order_id IN (
      SELECT id FROM marketplace_orders
      WHERE stripe_charge_id = ${chargeId} OR payment_intent_id = ${paymentIntentId}
    )
  `

  await sql`
    UPDATE orders
    SET refunded_minor = ${charge.amount_refunded},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE stripe_session_id = ${paymentIntentId} OR stripe_charge_id = ${chargeId}
  `
  await sql`
    UPDATE marketplace_referral_attributions
    SET status = CASE WHEN stripe_transfer_id IS NULL THEN 'canceled' ELSE status END,
      transfer_error = CASE WHEN stripe_transfer_id IS NULL
        THEN 'Refund recorded; payout blocked pending review.'
        ELSE 'Refund issued after transfer; manual recovery review required.' END,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE order_id IN (
      SELECT id FROM orders
      WHERE stripe_session_id = ${paymentIntentId} OR stripe_charge_id = ${chargeId}
    )
  `
}

async function handleChargeDispute(eventType: string, dispute: any) {
  const chargeId = typeof dispute.charge === 'string'
    ? dispute.charge
    : dispute.charge && typeof dispute.charge.id === 'string'
      ? dispute.charge.id
      : null
  const paymentIntentId = typeof dispute.payment_intent === 'string'
    ? dispute.payment_intent
    : null
  if (!chargeId || typeof dispute.id !== 'string') {
    throw new Error('Dispute event is missing its charge or dispute ID.')
  }

  const status = eventType === 'charge.dispute.closed' &&
    (dispute.status === 'won' || dispute.status === 'lost')
    ? dispute.status
    : 'open'
  await sql`
    UPDATE marketplace_orders
    SET dispute_status = ${status}, dispute_id = ${dispute.id},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE stripe_charge_id = ${chargeId} OR payment_intent_id = ${paymentIntentId}
  `
  await sql`
    UPDATE orders
    SET dispute_status = ${status}, dispute_id = ${dispute.id},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE stripe_charge_id = ${chargeId} OR stripe_session_id = ${paymentIntentId}
  `

  if (status === 'lost') {
    await sql`
      UPDATE marketplace_referral_attributions
        SET status = CASE WHEN stripe_transfer_id IS NULL THEN 'canceled' ELSE status END,
          transfer_error = CASE WHEN stripe_transfer_id IS NULL
            THEN 'Dispute lost; payout blocked.'
            ELSE 'Dispute lost after transfer; manual recovery review required.' END,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE order_id IN (
        SELECT id FROM orders
        WHERE stripe_charge_id = ${chargeId} OR stripe_session_id = ${paymentIntentId}
      )
    `
  }

  const pendingTransferError = getMarketplaceDisputeTransferError(status, false)
  const completedTransferError = getMarketplaceDisputeTransferError(status, true)
  await sql`
    UPDATE marketplace_seller_orders
    SET transfer_error = CASE
      WHEN ${status} = 'won' AND transfer_error IN (
        ${MARKETPLACE_DISPUTE_TRANSFER_ERRORS.openBlocked},
        ${MARKETPLACE_DISPUTE_TRANSFER_ERRORS.openTransferred},
        ${MARKETPLACE_DISPUTE_TRANSFER_ERRORS.lostBlocked},
        ${MARKETPLACE_DISPUTE_TRANSFER_ERRORS.lostTransferred}
      ) THEN NULL
      WHEN ${status} = 'won' THEN transfer_error
      WHEN stripe_transfer_id IS NULL THEN ${pendingTransferError}
      ELSE ${completedTransferError}
    END,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE marketplace_order_id IN (
      SELECT id FROM marketplace_orders
      WHERE stripe_charge_id = ${chargeId} OR payment_intent_id = ${paymentIntentId}
    )
  `
  await sql`
    UPDATE marketplace_seller_referral_attributions
    SET status = CASE
      WHEN ${status} = 'lost' AND stripe_transfer_id IS NULL THEN 'canceled'
      WHEN ${status} = 'won'
        AND status = 'canceled'
        AND transfer_error = ${MARKETPLACE_DISPUTE_TRANSFER_ERRORS.lostBlocked}
        THEN 'held'
      ELSE status
    END,
      transfer_error = CASE
      WHEN ${status} = 'won' AND transfer_error IN (
        ${MARKETPLACE_DISPUTE_TRANSFER_ERRORS.openBlocked},
        ${MARKETPLACE_DISPUTE_TRANSFER_ERRORS.openTransferred},
        ${MARKETPLACE_DISPUTE_TRANSFER_ERRORS.lostBlocked},
        ${MARKETPLACE_DISPUTE_TRANSFER_ERRORS.lostTransferred}
      ) THEN NULL
      WHEN ${status} = 'won' THEN transfer_error
      WHEN stripe_transfer_id IS NULL THEN ${pendingTransferError}
      ELSE ${completedTransferError}
    END,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE marketplace_order_id IN (
      SELECT id FROM marketplace_orders
      WHERE stripe_charge_id = ${chargeId} OR payment_intent_id = ${paymentIntentId}
    )
  `
  console.warn('[Webhook] Payment dispute status recorded:', chargeId, status)
}
