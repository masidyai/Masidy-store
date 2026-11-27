import { NextResponse } from 'next/server'
import { env } from 'cloudflare:workers'
import {
  createMarketplaceCheckoutQuote,
  MarketplaceCheckoutError,
  parseMarketplaceCheckoutItems,
} from '@/lib/marketplace/checkout'

export async function POST(request: Request) {
  if (String(env.MARKETPLACE_CHECKOUT_ENABLED).toLowerCase() !== 'true') {
    return NextResponse.json({ message: 'Marketplace checkout is not open yet.' }, { status: 503 })
  }
  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ message: 'Marketplace checkout is not configured.' }, { status: 503 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid checkout request.' }, { status: 400 })
  }
  if (!isRecord(body)) return NextResponse.json({ message: 'Invalid checkout request.' }, { status: 400 })
  const items = parseMarketplaceCheckoutItems(body.items)
  if (!items) return NextResponse.json({ message: 'Your marketplace bag is invalid.' }, { status: 400 })

  try {
    const quote = await createMarketplaceCheckoutQuote(items, body.address, env.STRIPE_SECRET_KEY)
    return NextResponse.json({
      currency: quote.currency,
      subtotalMinor: quote.subtotalMinor,
      shippingMinor: quote.shippingMinor,
      taxMinor: quote.taxMinor,
      totalMinor: quote.totalMinor,
      lines: quote.lines.map((line) => ({
        listingId: line.listing.id,
        title: line.listing.title,
        quantity: line.quantity,
        priceMinor: line.listing.priceMinor,
        shippingMinor: line.shippingMinor,
        sellerName: line.listing.sellerName,
      })),
    })
  } catch (error) {
    if (error instanceof MarketplaceCheckoutError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error('[Marketplace] Could not calculate checkout quote:', error)
    return NextResponse.json({ message: 'Could not calculate marketplace checkout totals.' }, { status: 500 })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
