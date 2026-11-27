import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { sql } from '@/lib/db/client'

interface SellerOrderRow {
  id: string
  status: string
  subtotal_minor: number
  shipping_minor: number
  commission_minor: number
  transfer_minor: number
  currency: string
  tracking_number: string | null
  tracking_url: string | null
  shipped_at: string | null
  delivered_at: string | null
  transfer_status: string
  transfer_error: string | null
  shipping_address: string
  email: string
  created_at: string
  listing_id: string
  title: string
  quantity: number
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Please sign in.' }, { status: 401 })
  if (!user.isSeller) return NextResponse.json({ message: 'Seller access is not active.' }, { status: 403 })

  const result = await sql<SellerOrderRow>`
    SELECT so.id, so.status, so.subtotal_minor, so.shipping_minor, so.commission_minor,
      so.transfer_minor, so.currency, so.tracking_number, so.tracking_url, so.shipped_at,
      so.delivered_at, so.transfer_status, so.transfer_error, so.created_at,
      mo.shipping_address, mo.email,
      i.listing_id, i.title, i.quantity
    FROM marketplace_seller_orders so
    JOIN marketplace_orders mo ON mo.id = so.marketplace_order_id
    JOIN marketplace_order_items i ON i.seller_order_id = so.id
    WHERE so.seller_user_id = ${user.id}
    ORDER BY so.created_at DESC, i.title
  `
  const orders = groupOrders(result.rows)
  return NextResponse.json({ orders })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Please sign in.' }, { status: 401 })
  if (!user.isSeller) return NextResponse.json({ message: 'Seller access is not active.' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid tracking details.' }, { status: 400 })
  }
  if (!isRecord(body)) return NextResponse.json({ message: 'Invalid tracking details.' }, { status: 400 })
  const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : ''
  const trackingNumber = typeof body.trackingNumber === 'string' ? body.trackingNumber.trim().slice(0, 120) : ''
  const trackingUrl = safeTrackingUrl(body.trackingUrl)
  if (!orderId || !trackingNumber || !trackingUrl) {
    return NextResponse.json({ message: 'Enter a tracking number and a valid HTTPS tracking link.' }, { status: 400 })
  }

  const updated = await sql<{ id: string }>`
    UPDATE marketplace_seller_orders
    SET status = 'shipped',
      tracking_number = ${trackingNumber},
      tracking_url = ${trackingUrl},
      shipped_at = COALESCE(shipped_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ${orderId}
      AND seller_user_id = ${user.id}
      AND status IN ('paid', 'processing', 'shipped')
      AND delivered_at IS NULL
    RETURNING id
  `
  if (!updated.rows[0]) {
    return NextResponse.json({ message: 'This order cannot be updated or does not belong to you.' }, { status: 409 })
  }
  return NextResponse.json({ updated: true })
}

function groupOrders(rows: SellerOrderRow[]) {
  const grouped = new Map<string, {
    id: string
    status: string
    subtotalMinor: number
    shippingMinor: number
    commissionMinor: number
    transferMinor: number
    currency: string
    trackingNumber: string | null
    trackingUrl: string | null
    shippedAt: string | null
    deliveredAt: string | null
    transferStatus: string
    transferError: string | null
    shippingAddress: unknown
    email: string
    createdAt: string
    items: Array<{ listingId: string; title: string; quantity: number }>
  }>()
  for (const row of rows) {
    let order = grouped.get(row.id)
    if (!order) {
      let shippingAddress: unknown
      try {
        shippingAddress = JSON.parse(row.shipping_address)
      } catch {
        throw new TypeError('Saved marketplace delivery address is invalid.')
      }
      order = {
        id: row.id,
        status: row.status,
        subtotalMinor: row.subtotal_minor,
        shippingMinor: row.shipping_minor,
        commissionMinor: row.commission_minor,
        transferMinor: row.transfer_minor,
        currency: row.currency,
        trackingNumber: row.tracking_number,
        trackingUrl: row.tracking_url,
        shippedAt: row.shipped_at,
        deliveredAt: row.delivered_at,
        transferStatus: row.transfer_status,
        transferError: row.transfer_error,
        shippingAddress,
        email: row.email,
        createdAt: row.created_at,
        items: [],
      }
      grouped.set(row.id, order)
    }
    order.items.push({ listingId: row.listing_id, title: row.title, quantity: row.quantity })
  }
  return [...grouped.values()]
}

function safeTrackingUrl(value: unknown): string {
  if (typeof value !== 'string') return ''
  try {
    const url = new URL(value.trim())
    return url.protocol === 'https:' && !url.username && !url.password ? url.toString() : ''
  } catch {
    return ''
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
