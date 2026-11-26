import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { env } from 'cloudflare:workers'
import { sql } from '@/lib/db/client'
import { verifyStripeSignature } from '@/lib/stripe/webhook-signature'
import { recordStripeTaxTransaction } from '@/lib/checkout/stripe-tax'
import { getOrderById, setOrderPrintfulOrderId } from '@/lib/db/orders'
import { submitPaidOrder } from '@/lib/printful/orders'

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

    if (paymentIntent.metadata?.checkout_flow === 'printful_cost_plus') {
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
