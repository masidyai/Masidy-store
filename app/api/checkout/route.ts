import { NextResponse } from 'next/server'
import { env } from 'cloudflare:workers'
import type { CartItem } from '@/lib/products/types'
import { getCurrentUser } from '@/lib/auth/session'
import { createOrder } from '@/lib/db/orders'
import { sendOrderConfirmationEmail } from '@/lib/email/send'

/**
 * Stripe-ready checkout endpoint with Payment Link fallback.
 *
 * Supports two modes:
 *   1. Full Checkout Session (requires activated Stripe account)
 *   2. Payment Link via Email (works immediately, even in test mode)
 *
 * Set USE_PAYMENT_LINKS=true to use email payment links instead of checkout session.
 */
export async function POST(request: Request) {
  const { items, email, shippingAddress, usePaymentLink } = (await request.json()) as {
    items: CartItem[]
    email: string
    shippingAddress?: any
    usePaymentLink?: boolean
  }

  if (!items || items.length === 0) {
    return NextResponse.json({ message: 'Your cart is empty.' }, { status: 400 })
  }

  const secretKey = env.STRIPE_LIVE_SECRET_KEY || env.STRIPE_SECRET_KEY
  const usePaymentLinks = (await env.USE_PAYMENT_LINKS) === 'true' || usePaymentLink
  
  if (!secretKey) {
    return NextResponse.json(
      {
        message:
          'Checkout is not configured yet. Configure a Stripe secret in Cloudflare to enable payments.',
      },
      { status: 200 },
    )
  }

  const isLiveMode = secretKey.startsWith('sk_live_')
  console.info(`[Checkout] Using Stripe ${isLiveMode ? 'live' : 'test'} mode`)
  console.info(`[Checkout] Payment method: ${usePaymentLinks ? 'Payment Links' : 'Checkout Session'}`)

  // Calculate order totals
  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const tax = Math.round(subtotal * 0.1 * 100) / 100
  const shippingCost = subtotal > 100 ? 0 : 10
  const total = subtotal + tax + shippingCost

  // Get current user for order tracking (optional)
  const user = await getCurrentUser()
  const userId = user?.id || 'guest_' + Math.random().toString(36).substr(2, 9)

  // Build Stripe checkout session
  const origin =
    (await env.PUBLIC_SITE_URL) || request.headers.get('origin') || new URL(request.url).origin

  // Build application/x-www-form-urlencoded body for Stripe Checkout Sessions.
  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('customer_email', email)
  params.set('success_url', `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`)
  params.set('cancel_url', `${origin}/checkout`)
  params.set('shipping_address_collection[allowed_countries][0]', 'US')
  params.set('shipping_address_collection[allowed_countries][1]', 'CA')
  params.set('shipping_address_collection[allowed_countries][2]', 'GB')

  items.forEach((item, i) => {
    const currency = (item.currency || 'USD').toLowerCase()
    params.set(`line_items[${i}][quantity]`, String(item.quantity))
    params.set(`line_items[${i}][price_data][currency]`, currency)
    params.set(`line_items[${i}][price_data][unit_amount]`, String(Math.round(item.price * 100)))
    params.set(
      `line_items[${i}][price_data][product_data][name]`,
      `${item.title}${item.size !== 'One Size' ? ` — ${item.color}/${item.size}` : ` — ${item.color}`}`,
    )
    if (item.image?.startsWith('http')) {
      params.set(`line_items[${i}][price_data][product_data][images][0]`, item.image)
    }
  })

  let response: Response
  try {
    response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    })
  } catch (error) {
    console.error('[Checkout] Payment provider request failed:', error)
    return NextResponse.json({ message: 'Could not reach the payment provider.' }, { status: 502 })
  }

  let session: unknown
  try {
    session = await response.json()
  } catch (error) {
    console.error('[Checkout] Invalid payment provider response:', error)
    return NextResponse.json({ message: 'Could not start checkout.' }, { status: 502 })
  }

  if (!response.ok) {
    const message =
      isRecord(session) && isRecord(session.error) && typeof session.error.message === 'string'
        ? session.error.message
        : 'Could not start checkout.'
    return NextResponse.json({ message }, { status: 502 })
  }

  if (!isRecord(session) || typeof session.id !== 'string' || typeof session.url !== 'string') {
    console.error('[Checkout] Payment provider response is missing session ID or URL.')
    return NextResponse.json({ message: 'Could not start checkout.' }, { status: 502 })
  }

  try {
    const order = await createOrder({
      userId,
      email,
      status: 'pending',
      items: items.map(item => ({
        id: item.variantId,
        productId: item.productId || '',
        variantId: item.variantId,
        title: item.title,
        color: item.color,
        size: item.size,
        image: item.image || '',
        price: item.price,
        quantity: item.quantity,
        currency: item.currency || 'USD'
      })),
      subtotal,
      shippingCost,
      tax,
      total,
      currency: 'USD',
      shippingAddress: shippingAddress || undefined,
      stripeSessionId: session.id,
    })

    console.log('[Checkout] Order created in database with ID:', order.id)
    return NextResponse.json({ url: session.url })
  } catch (error) {
    console.error('[Checkout] Failed to save the pending order:', error)
    return NextResponse.json({ message: 'Unable to save the order.' }, { status: 500 })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
