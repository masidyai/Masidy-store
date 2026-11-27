import { NextResponse } from 'next/server'
import { toMinorUnits } from '@/lib/checkout/money'
import { getCurrentUser } from '@/lib/auth/session'
import { createSellerListing } from '@/lib/marketplace/db'
import type { ShippingZone } from '@/lib/marketplace/db'

const SUPPORTED_CURRENCIES = new Set(['EUR', 'USD', 'GBP'])

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Please sign in.' }, { status: 401 })
  if (!user.isSeller) return NextResponse.json({ message: 'Seller access is not active.' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid listing.' }, { status: 400 })
  }
  if (!isRecord(body)) return NextResponse.json({ message: 'Invalid listing.' }, { status: 400 })

  const title = text(body.title, 150)
  const description = text(body.description, 3000)
  const category = text(body.category, 60)
  const imageUrl = safeImageUrl(body.imageUrl)
  const currency = typeof body.currency === 'string' ? body.currency.toUpperCase() : ''
  const priceMinor = toMinorUnits(body.price, currency)
  const zones = parseShippingZones(body.shippingZones, currency)
  const status = body.submit === true ? 'pending_review' : 'draft'
  if (
    !title ||
    !description ||
    !category ||
    !imageUrl ||
    !SUPPORTED_CURRENCIES.has(currency) ||
    priceMinor === null ||
    !Number.isSafeInteger(priceMinor) ||
    priceMinor < 1 ||
    zones === null ||
    (status === 'pending_review' && zones.length === 0)
  ) {
    return NextResponse.json(
      { message: 'Enter a valid product, price, image URL, currency, and at least one shipping zone to submit.' },
      { status: 400 },
    )
  }

  try {
    const listingId = await createSellerListing({
      sellerUserId: user.id,
      title,
      description,
      category,
      imageUrl,
      priceMinor,
      currency,
      shippingZones: zones ?? [],
      status,
    })
    return NextResponse.json({ listingId, status }, { status: 201 })
  } catch (error) {
    console.error('[Marketplace] Could not save seller listing:', error)
    return NextResponse.json({ message: 'Could not save your listing.' }, { status: 500 })
  }
}

function parseShippingZones(value: unknown, currency: string): ShippingZone[] | null {
  if (!Array.isArray(value) || value.length > 100) return null
  const seen = new Set<string>()
  const zones: ShippingZone[] = []
  for (const zone of value) {
    if (!isRecord(zone) || typeof zone.country !== 'string') return null
    const country = zone.country.toUpperCase()
    const amountMinor = toMinorUnits(zone.amount, currency)
    if (
      !/^[A-Z]{2}$/.test(country) ||
      seen.has(country) ||
      amountMinor === null ||
      !Number.isSafeInteger(amountMinor)
    ) return null
    seen.add(country)
    zones.push({ country, amountMinor })
  }
  return zones
}

function safeImageUrl(value: unknown): string {
  const imageUrl = text(value, 2048)
  try {
    const parsed = new URL(imageUrl)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? parsed.toString() : ''
  } catch {
    return ''
  }
}

function text(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
