import { NextResponse } from 'next/server'
import { env } from 'cloudflare:workers'
import { getCurrentUser } from '@/lib/auth/session'
import {
  fromMinorUnits,
  estimatePrintfulOrderCosts,
  getPrintfulCustomerTotals,
  getPrintfulItemPrice,
  getPricedCheckoutItems,
  getPrintfulShippingRates,
  parseCheckoutAddress,
  parseCheckoutItems,
  type PricedCheckoutItem,
  type PrintfulShippingRate,
} from '@/lib/checkout/printful'
import { isPrintfulShippingCountry } from '@/lib/checkout/shipping-countries'
import { createOrder, setOrderStripeSessionId, updateOrderStatus } from '@/lib/db/orders'
import { getMarketplaceCommissionRatesBps } from '@/lib/marketplace/db'
import { getActiveResellerReferral } from '@/lib/marketplace/referrals'

export async function GET() {
  const publishableKey = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!publishableKey) {
    return NextResponse.json({ message: 'Payments are not configured.' }, { status: 503 })
  }
  return NextResponse.json({ publishableKey })
}

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid checkout request.' }, { status: 400 })
  }

  if (!isRecord(body)) {
    return NextResponse.json({ message: 'Invalid checkout request.' }, { status: 400 })
  }

  const items = parseCheckoutItems(body.items)
  const address = parseCheckoutAddress(body.shippingAddress)
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const shippingRateId = typeof body.shippingRateId === 'string' ? body.shippingRateId : ''
  const expectedShippingCents = body.expectedShippingCents
  const expectedTotalCents = body.expectedTotalCents
  const expectedCurrency = typeof body.expectedCurrency === 'string'
    ? body.expectedCurrency.toUpperCase()
    : ''

  if (
    !items ||
    !address ||
    !email ||
    email !== address.email ||
    !shippingRateId ||
    typeof expectedShippingCents !== 'number' ||
    !Number.isInteger(expectedShippingCents) ||
    expectedShippingCents < 0 ||
    typeof expectedTotalCents !== 'number' ||
    !Number.isInteger(expectedTotalCents) ||
    expectedTotalCents < 1 ||
    !/^[A-Z]{3}$/.test(expectedCurrency)
  ) {
    return NextResponse.json({ message: 'Please check your shipping and payment details.' }, { status: 400 })
  }
  if (!isPrintfulShippingCountry(address.country)) {
    return NextResponse.json({ message: 'Shipping is not available for this country.' }, { status: 400 })
  }

  const secretKey = env.STRIPE_SECRET_KEY
  const printfulToken = env.PRINTFUL_API_TOKEN
  if (!secretKey || !printfulToken) {
    return NextResponse.json({ message: 'Checkout is temporarily unavailable.' }, { status: 503 })
  }

  let pricedItems: PricedCheckoutItem[]
  let rate: PrintfulShippingRate | undefined
  let totals: ReturnType<typeof getPrintfulCustomerTotals> | undefined
  let printfulCostMinor = 0
  let itemPrices: number[] = []
  try {
    pricedItems = await getPricedCheckoutItems(items, printfulToken, env.PRINTFUL_STORE_ID)
    const rates = await getPrintfulShippingRates(
      pricedItems,
      address,
      printfulToken,
      env.PRINTFUL_STORE_ID,
    )
    rate = rates.find((candidate) => candidate.id === shippingRateId)
    if (rate) {
      const estimate = await estimatePrintfulOrderCosts(
        pricedItems,
        address,
        rate.id,
        printfulToken,
        env.PRINTFUL_STORE_ID,
      )
      const quantity = pricedItems.reduce((sum, item) => sum + item.quantity, 0)
      totals = getPrintfulCustomerTotals(estimate, quantity)
      printfulCostMinor = estimate.totalCents
      itemPrices = await Promise.all(
        pricedItems.map((item) =>
          getPrintfulItemPrice(item, address, printfulToken, env.PRINTFUL_STORE_ID, rate.id),
        ),
      )
      if (itemPrices.some((price) => !Number.isInteger(price))) {
        throw new Error('Printful returned incomplete item prices.')
      }
    }
  } catch (error) {
    console.error('[Checkout] Could not verify Printful prices and shipping:', error)
    return NextResponse.json({ message: 'Could not verify shipping. Please try again.' }, { status: 502 })
  }

  if (
    !rate ||
    !totals ||
    totals.shippingCents !== expectedShippingCents ||
    totals.currency !== expectedCurrency ||
    totals.totalCents !== expectedTotalCents
  ) {
    return NextResponse.json(
      { message: 'Shipping or tax prices changed. Please calculate them again.' },
      { status: 409 },
    )
  }

  let order
  try {
    const user = await getCurrentUser()
    const referralCandidate = await getActiveResellerReferral()
    const referral = referralCandidate?.userId === user?.id ? null : referralCandidate
    const commissionSettings = referral ? await getMarketplaceCommissionRatesBps() : null
    if (referral && commissionSettings?.reseller_rate_bps == null) {
      return NextResponse.json({ message: 'Reseller commissions are not configured yet.' }, { status: 503 })
    }
    order = await createOrder({
      userId: user?.id || `guest_${crypto.randomUUID()}`,
      referrerUserId: referral?.userId,
      resellerRateBps: commissionSettings?.reseller_rate_bps ?? undefined,
      email,
      status: 'pending',
      items: pricedItems.map(({ printfulVariantId: _printfulVariantId, priceCents: _priceCents, ...item }, index) => {
        const priceCents = itemPrices[index]
        if (priceCents === undefined) throw new Error('Printful returned an incomplete item price.')
        return {
          ...item,
          price: fromMinorUnits(priceCents, totals.currency),
          currency: totals.currency,
        }
      }),
      subtotal: fromMinorUnits(
        totals.totalCents - totals.shippingCents - totals.taxCents,
        totals.currency,
      ),
      shippingCost: fromMinorUnits(totals.shippingCents, totals.currency),
      tax: fromMinorUnits(totals.taxCents, totals.currency),
      total: fromMinorUnits(totals.totalCents, totals.currency),
      currency: totals.currency,
      printfulCostMinor,
      shippingAddress: {
        ...address,
        state: address.state ?? '',
        zip: address.zip ?? '',
      },
    })
  } catch (error) {
    console.error('[Checkout] Failed to save the pending order:', error)
    return NextResponse.json({ message: 'Unable to save the order.' }, { status: 500 })
  }

  const params = new URLSearchParams()
  params.set('amount', String(totals.totalCents))
  params.set('currency', totals.currency.toLowerCase())
  params.set('automatic_payment_methods[enabled]', 'true')
  params.set('receipt_email', email)
  params.set('metadata[order_id]', order.id)
  params.set('metadata[shipping_rate_id]', rate.id)
  params.set('metadata[checkout_flow]', 'printful_cost_plus')
  params.set('metadata[fulfillment_mode]', 'automatic')
  params.set('shipping[name]', address.name)
  params.set('shipping[address][line1]', address.address1)
  params.set('shipping[address][city]', address.city)
  params.set('shipping[address][country]', address.country)
  if (address.address2) params.set('shipping[address][line2]', address.address2)
  if (address.state) params.set('shipping[address][state]', address.state)
  if (address.zip) params.set('shipping[address][postal_code]', address.zip)
  if (address.phone) params.set('shipping[phone]', address.phone)

  let response: Response
  try {
    response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
  } catch (error) {
    console.error('[Checkout] Could not reach Stripe:', error)
    await updateOrderStatus(order.id, 'failed')
    return NextResponse.json({ message: 'Could not reach the payment provider.' }, { status: 502 })
  }

  let paymentIntent: unknown
  try {
    paymentIntent = await response.json()
  } catch (error) {
    console.error('[Checkout] Stripe returned invalid JSON:', error)
    await updateOrderStatus(order.id, 'failed')
    return NextResponse.json({ message: 'Could not start payment.' }, { status: 502 })
  }

  if (!response.ok) {
    const message = isRecord(paymentIntent) && isRecord(paymentIntent.error) &&
      typeof paymentIntent.error.message === 'string'
      ? paymentIntent.error.message
      : 'Could not start payment.'
    await updateOrderStatus(order.id, 'failed')
    return NextResponse.json({ message }, { status: 502 })
  }

  if (
    !isRecord(paymentIntent) ||
    typeof paymentIntent.id !== 'string' ||
    typeof paymentIntent.client_secret !== 'string'
  ) {
    console.error('[Checkout] Stripe response is missing payment intent details.')
    await updateOrderStatus(order.id, 'failed')
    return NextResponse.json({ message: 'Could not start payment.' }, { status: 502 })
  }

  try {
    await setOrderStripeSessionId(order.id, paymentIntent.id)
  } catch (error) {
    console.error('[Checkout] Could not link the Stripe payment to the order:', error)
    return NextResponse.json({ message: 'Could not prepare your order for payment.' }, { status: 500 })
  }

  return NextResponse.json({
    clientSecret: paymentIntent.client_secret,
    orderId: order.id,
    totalCents: totals.totalCents,
    currency: totals.currency,
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
