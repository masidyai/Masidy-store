import { NextResponse } from 'next/server'
import { env } from 'cloudflare:workers'
import {
  estimatePrintfulOrderCosts,
  getPrintfulCustomerTotals,
  getPrintfulItemPrice,
  getPricedCheckoutItems,
  getPrintfulShippingRates,
  parseCheckoutAddress,
  parseCheckoutItems,
  PRINTFUL_MARKUP_CENTS_PER_ITEM,
} from '@/lib/checkout/printful'
import { isPrintfulShippingCountry } from '@/lib/checkout/shipping-countries'

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
  if (!token) {
    return NextResponse.json({ message: 'Product pricing is temporarily unavailable.' }, { status: 503 })
  }

  try {
    const pricedItems = await getPricedCheckoutItems(items, token, env.PRINTFUL_STORE_ID)
    const rates = await getPrintfulShippingRates(pricedItems, address, token, env.PRINTFUL_STORE_ID)
    const primaryRate = rates[0]
    if (!primaryRate) {
      return NextResponse.json(
        { message: 'No shipping methods are available for this address and cart.' },
        { status: 422 },
      )
    }

    const itemPrices = await Promise.all(
      pricedItems.map((item) =>
        getPrintfulItemPrice(item, address, token, env.PRINTFUL_STORE_ID, primaryRate.id),
      ),
    )
    if (itemPrices.length !== pricedItems.length || itemPrices.some((price) => !Number.isInteger(price))) {
      throw new Error('Printful returned incomplete item prices.')
    }
    const totalQuantity = pricedItems.reduce((sum, item) => sum + item.quantity, 0)
    const itemSubtotalCents = pricedItems.reduce(
      (sum, item, index) => {
        const priceCents = itemPrices[index]
        if (priceCents === undefined) throw new Error('Printful returned an incomplete item price.')
        return sum + priceCents * item.quantity
      },
      0,
    )
    const estimates = await Promise.all(rates.map(async (rate) => {
      const estimate = await estimatePrintfulOrderCosts(
        pricedItems,
        address,
        rate.id,
        token,
        env.PRINTFUL_STORE_ID,
      )
      const totals = getPrintfulCustomerTotals(estimate, totalQuantity)
      return {
        ...rate,
        currency: totals.currency,
        amountCents: totals.shippingCents,
        taxCents: totals.taxCents,
        digitizationCents: totals.digitizationCents,
        otherFeesCents: totals.otherFeesCents,
        subtotalCents: totals.subtotalCents,
        adjustmentCents: totals.subtotalCents - itemSubtotalCents,
        totalCents: totals.totalCents,
      }
    }))

    const primaryEstimate = estimates[0]
    if (!primaryEstimate) throw new Error('Printful returned no usable order estimate.')

    return NextResponse.json({
      currency: primaryEstimate.currency,
      subtotalCents: primaryEstimate.subtotalCents,
      adjustmentCents: primaryEstimate.subtotalCents - itemSubtotalCents,
      markupCents: PRINTFUL_MARKUP_CENTS_PER_ITEM * totalQuantity,
      items: pricedItems.map(({ id, title, color, size, quantity }, index) => ({
        id,
        title,
        color,
        size,
        priceCents: itemPrices[index],
        quantity,
      })),
      rates: estimates,
    })
  } catch (error) {
    console.error('[Checkout] Printful shipping quote failed:', error)
    return NextResponse.json(
      {
        message: 'Could not calculate your order costs. Please check the address and try again.',
      },
      { status: 502 },
    )
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
