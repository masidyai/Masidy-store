import { NextResponse } from 'next/server'
import { env } from 'cloudflare:workers'
import { getCurrentUser } from '@/lib/auth/session'
import { getMarketplaceCommissionRatesBps, getMarketplacePayoutAccount, createMarketplaceOrder, saveMarketplacePaymentIntent } from '@/lib/marketplace/db'
import {
  createMarketplaceCheckoutQuote,
  MarketplaceCheckoutError,
  parseMarketplaceCheckoutItems,
} from '@/lib/marketplace/checkout'
import { createMarketplacePaymentIntent, MarketplacePaymentError } from '@/lib/stripe/marketplace-payments'
import { getActiveResellerReferral } from '@/lib/marketplace/referrals'

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
  const checkoutKey = typeof body.checkoutKey === 'string' ? body.checkoutKey : ''
  const expectedTotalMinor = body.expectedTotalMinor
  if (!items || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(checkoutKey)) {
    return NextResponse.json({ message: 'Your marketplace bag is invalid. Refresh checkout and try again.' }, { status: 400 })
  }
  if (typeof expectedTotalMinor !== 'number' || !Number.isSafeInteger(expectedTotalMinor) || expectedTotalMinor < 1) {
    return NextResponse.json({ message: 'Review your delivery details and total before paying.' }, { status: 400 })
  }

  try {
    const quote = await createMarketplaceCheckoutQuote(items, body.address, env.STRIPE_SECRET_KEY)
    if (quote.totalMinor !== expectedTotalMinor) {
      return NextResponse.json({ message: 'The total changed. Review the updated amount before paying.' }, { status: 409 })
    }
    const email = quote.address.email
    const user = await getCurrentUser()
    const commissionSettings = await getMarketplaceCommissionRatesBps()
    const sellerRateBps = commissionSettings.seller_rate_bps
    if (sellerRateBps === null || sellerRateBps >= 10000) {
      return NextResponse.json({ message: 'Marketplace seller commissions are not configured yet.' }, { status: 503 })
    }
    const referralCandidate = await getActiveResellerReferral()
    const referral = referralCandidate?.userId === user?.id ? null : referralCandidate
    const resellerRateBps = referral ? commissionSettings.reseller_rate_bps : null
    if (referral && resellerRateBps == null) {
      return NextResponse.json({ message: 'Marketplace reseller commissions are not configured yet.' }, { status: 503 })
    }

    const sellerIds = [...new Set(quote.lines.map((line) => line.sellerUserId))]
    for (const sellerId of sellerIds) {
      const payout = await getMarketplacePayoutAccount(sellerId)
      if (!payout?.stripeAccountId || !payout.transfersActive || !payout.payoutsEnabled) {
        return NextResponse.json({ message: 'A seller is not ready to accept marketplace orders yet.' }, { status: 503 })
      }
    }

    const addressSnapshot = JSON.stringify(quote.address)
    const checkoutFingerprint = await fingerprint({
      items: [...items].sort((a, b) => a.listingId.localeCompare(b.listingId)),
      address: quote.address,
      lines: quote.lines.map((line) => ({
        listingId: line.listing.id,
        sellerUserId: line.sellerUserId,
        priceMinor: line.listing.priceMinor,
        shippingMinor: line.shippingMinor,
        taxCode: line.taxCode,
      })),
    })
    const order = await createMarketplaceOrder({
      checkoutKey,
      checkoutFingerprint,
      userId: user?.id ?? null,
      email,
      referrerUserId: referral?.userId ?? null,
      resellerRateBps,
      taxCalculationId: quote.taxCalculationId,
      currency: quote.currency,
      shippingAddress: addressSnapshot,
      subtotalMinor: quote.subtotalMinor,
      shippingMinor: quote.shippingMinor,
      taxMinor: quote.taxMinor,
      totalMinor: quote.totalMinor,
      sellerRateBps,
      sellerTaxes: quote.sellerTaxes,
      lines: quote.lines.map((line) => ({
        listingId: line.listing.id,
        sellerUserId: line.sellerUserId,
        title: line.listing.title,
        imageUrl: line.listing.imageUrl,
        quantity: line.quantity,
        priceMinor: line.listing.priceMinor,
        shippingMinor: line.shippingMinor,
        taxCode: line.taxCode,
      })),
    })

    const payment = await createMarketplacePaymentIntent({
      secretKey: env.STRIPE_SECRET_KEY,
      orderId: order.orderId,
      transferGroup: order.transferGroup,
      checkoutKey,
      taxCalculationId: order.taxCalculationId,
      email,
      amountMinor: quote.totalMinor,
      currency: quote.currency,
    })
    await saveMarketplacePaymentIntent(order.orderId, payment.id)
    return NextResponse.json({
      orderId: order.orderId,
      clientSecret: payment.clientSecret,
      totalMinor: quote.totalMinor,
      currency: quote.currency,
    })
  } catch (error) {
    if (error instanceof MarketplaceCheckoutError || error instanceof MarketplacePaymentError) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    if (error instanceof Error && error.message.startsWith('This checkout has changed.')) {
      return NextResponse.json({ message: error.message }, { status: 409 })
    }
    console.error('[Marketplace] Could not create payment:', error)
    return NextResponse.json({ message: 'Could not start marketplace payment.' }, { status: 500 })
  }
}

async function fingerprint(value: unknown): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
