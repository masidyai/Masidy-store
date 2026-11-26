import { NextResponse } from 'next/server'
import { env } from 'cloudflare:workers'
import {
  getOrderTotals,
  getPricedCheckoutItems,
  getPrintfulShippingRates,
  parseCheckoutAddress,
  parseCheckoutItems,
} from '@/lib/checkout/printful'
import { isPrintfulShippingCountry } from '@/lib/checkout/shipping-countries'
import { calculateStripeTax, StripeTaxError } from '@/lib/checkout/stripe-tax'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid shipping request.' }, { status: 400 })
  }
  if (!isRecord(body)) {
    return NextResponse.json({ message: 'Invalid shipping request.' }, { status: 400 })
  }

  const items = parseCheckoutItems(body.items)
  const address = parseCheckoutAddress(body.shippingAddress)
  if (!items || !address) {
    return NextResponse.json({ message: 'Please enter a valid cart and shipping address.' }, { status: 400 })
  }
  if (!isPrintfulShippingCountry(address.country)) {
    return NextResponse.json({ message: 'Shipping is not available for this country.' }, { status: 400 })
  }

  const token = env.PRINTFUL_API_TOKEN
  const stripeSecretKey = env.STRIPE_SECRET_KEY
  if (!token || !stripeSecretKey) {
    return NextResponse.json({ message: 'Shipping and tax quotes are temporarily unavailable.' }, { status: 503 })
  }

  try {
    const pricedItems = await getPricedCheckoutItems(items, token, env.PRINTFUL_STORE_ID)
    const rates = await getPrintfulShippingRates(pricedItems, address, token, env.PRINTFUL_STORE_ID)
    if (rates.length === 0) {
      return NextResponse.json(
        { message: 'No shipping methods are available for this address and cart.' },
        { status: 422 },
      )
    }

    const quotedRates = await Promise.all(rates.map(async (rate) => {
      const taxCalculation = await calculateStripeTax(
        stripeSecretKey,
        pricedItems,
        address,
        rate.amountCents,
        rate.currency,
      )
      const totals = getOrderTotals(pricedItems, rate.amountCents, taxCalculation.taxCents)
      if (taxCalculation.totalCents !== totals.totalCents) {
        throw new Error('Stripe Tax returned inconsistent totals.')
      }
      return {
        ...rate,
        taxCents: taxCalculation.taxCents,
        totalCents: taxCalculation.totalCents,
      }
    }))

    return NextResponse.json({
      currency: pricedItems[0]?.currency ?? 'USD',
      subtotalCents: pricedItems.reduce((sum, item) => sum + item.priceCents * item.quantity, 0),
      items: pricedItems.map(({ id, title, color, size, priceCents, quantity }) => ({
        id,
        title,
        color,
        size,
        priceCents,
        quantity,
      })),
      rates: quotedRates,
    })
  } catch (error) {
    console.error('[Checkout] Printful shipping quote failed:', error)
    return NextResponse.json(
      {
        message: error instanceof StripeTaxError
          ? error.message
          : 'Could not calculate shipping and tax. Please check the address and try again.',
      },
      {
        status: error instanceof StripeTaxError &&
          error.status < 500 && error.status !== 401 && error.status !== 403
          ? 422
          : 502,
      },
    )
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
