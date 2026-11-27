import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { sql } from '@/lib/db/client'

interface DeliveryReviewRow {
  id: string
  seller_name: string | null
  seller_email: string
  status: string
  tracking_number: string | null
  tracking_url: string | null
  shipped_at: string | null
  created_at: string
  currency: string
  transfer_minor: number
  listing_title: string
}

interface TransferFailureRow {
  id: string
  payout_type: string
  seller_name: string | null
  seller_email: string
  transfer_minor: number
  currency: string
  transfer_error: string
  delivered_at: string
  transfer_status: string
}

interface MarketplaceRecoveryCaseRow {
  id: string
  marketplace_order_id: string
  payout_type: string
  seller_name: string | null
  seller_email: string
  transfer_minor: number
  currency: string
  stripe_transfer_id: string
  refunded_minor: number
  order_currency: string
  dispute_status: string
  dispute_id: string | null
  updated_at: string
}

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.isAdmin) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 })

  const result = await sql<DeliveryReviewRow>`
    SELECT so.id, u.name AS seller_name, u.email AS seller_email, so.status,
      so.tracking_number, so.tracking_url, so.shipped_at, so.created_at,
      so.currency, so.transfer_minor, MIN(i.title) AS listing_title
    FROM marketplace_seller_orders so
    JOIN users u ON u.id = so.seller_user_id
    JOIN marketplace_order_items i ON i.seller_order_id = so.id
    WHERE so.status = 'shipped' AND so.delivery_verified_by IS NULL
    GROUP BY so.id, u.name, u.email
    ORDER BY so.shipped_at ASC
  `
  const transferFailures = await sql<TransferFailureRow>`
    SELECT 'seller:' || so.id AS id, 'Seller' AS payout_type,
      u.name AS seller_name, u.email AS seller_email, so.transfer_minor, so.currency,
      so.transfer_error, so.delivered_at, so.transfer_status
    FROM marketplace_seller_orders so
    JOIN users u ON u.id = so.seller_user_id
    WHERE so.transfer_error IS NOT NULL AND so.stripe_transfer_id IS NULL
    UNION ALL
    SELECT 'reseller:' || ra.id AS id, 'Reseller' AS payout_type,
      u.name AS seller_name, u.email AS seller_email, ra.amount_minor AS transfer_minor,
      ra.currency, ra.transfer_error, so.delivered_at, ra.status AS transfer_status
    FROM marketplace_seller_referral_attributions ra
    JOIN users u ON u.id = ra.reseller_user_id
    JOIN marketplace_seller_orders so ON so.id = ra.seller_order_id
    WHERE ra.transfer_error IS NOT NULL AND ra.stripe_transfer_id IS NULL
    ORDER BY delivered_at DESC
    LIMIT 100
  `
  const recoveryCases = await sql<MarketplaceRecoveryCaseRow>`
    SELECT * FROM (
      SELECT 'seller:' || so.id AS id, mo.id AS marketplace_order_id, 'Seller' AS payout_type,
        u.name AS seller_name, u.email AS seller_email, so.transfer_minor,
        so.currency, so.stripe_transfer_id, mo.refunded_minor,
        mo.currency AS order_currency, mo.dispute_status, mo.dispute_id, mo.updated_at AS updated_at
      FROM marketplace_seller_orders so
      JOIN marketplace_orders mo ON mo.id = so.marketplace_order_id
      JOIN users u ON u.id = so.seller_user_id
      WHERE so.stripe_transfer_id IS NOT NULL
        AND (mo.refunded_minor > 0 OR mo.dispute_status IN ('open', 'lost'))
      UNION ALL
      SELECT 'reseller:' || ra.id AS id, mo.id AS marketplace_order_id, 'Reseller' AS payout_type,
        u.name AS seller_name, u.email AS seller_email, ra.amount_minor AS transfer_minor,
        ra.currency, ra.stripe_transfer_id, mo.refunded_minor,
        mo.currency AS order_currency, mo.dispute_status, mo.dispute_id, mo.updated_at AS updated_at
      FROM marketplace_seller_referral_attributions ra
      JOIN marketplace_orders mo ON mo.id = ra.marketplace_order_id
      JOIN users u ON u.id = ra.reseller_user_id
      WHERE ra.stripe_transfer_id IS NOT NULL
        AND (mo.refunded_minor > 0 OR mo.dispute_status IN ('open', 'lost'))
    ) AS recovery_cases
    ORDER BY recovery_cases.updated_at DESC
    LIMIT 100
  `
  return NextResponse.json({
    deliveries: result.rows,
    transferFailures: transferFailures.rows,
    recoveryCases: recoveryCases.rows,
  })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user?.isAdmin) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid delivery review.' }, { status: 400 })
  }
  if (!isRecord(body) || body.action !== 'confirm_delivery' || typeof body.sellerOrderId !== 'string') {
    return NextResponse.json({ message: 'Invalid delivery review.' }, { status: 400 })
  }

  const result = await sql<{ id: string }>`
    UPDATE marketplace_seller_orders
    SET status = 'delivered',
      delivered_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      delivery_verified_by = ${user.id},
      transfer_status = 'held',
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ${body.sellerOrderId}
      AND status = 'shipped'
      AND tracking_number IS NOT NULL
      AND tracking_url IS NOT NULL
      AND delivery_verified_by IS NULL
    RETURNING id
  `
  if (!result.rows[0]) {
    return NextResponse.json({ message: 'This shipment is not awaiting delivery verification.' }, { status: 409 })
  }
  await sql`
    UPDATE marketplace_seller_referral_attributions
    SET available_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '+30 days'),
      status = 'held',
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE seller_order_id = ${body.sellerOrderId}
      AND status = 'held'
      AND stripe_transfer_id IS NULL
  `
  return NextResponse.json({ verified: true, payoutHoldDays: 30 })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
