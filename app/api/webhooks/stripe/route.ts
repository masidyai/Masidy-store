import { NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { env } from 'cloudflare:workers'
import { sql } from '@/lib/db/client'

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
        console.log('[Webhook] Payment succeeded:', paymentIntent.id)
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

async function verifyStripeSignature(body: string, signature: string, secret: string) {
  // Simple HMAC verification (in production, use stripe library)
  // For now, we'll parse the event directly for testing
  // In production: const event = stripe.webhooks.constructEvent(body, signature, secret)
  
  const event = JSON.parse(body)
  
  // TODO: Add proper signature verification in production
  // This is a simplified version for development
  return event
}

async function handleCheckoutCompleted(session: any) {
  console.log('[Webhook] Checkout completed:', session.id)

  try {
    // Find order by Stripe session ID
    const result = await sql<{ id: string; email: string; user_id: string }>`
      UPDATE orders
      SET status = 'confirmed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE stripe_session_id = ${session.id}
      RETURNING id, email, user_id
    `

    if (result.rows.length === 0) {
      console.error('[Webhook] Order not found for session:', session.id)
      return
    }

    const order = result.rows[0]
    console.log('[Webhook] Order confirmed:', order.id)

    // Send confirmation email (if not already sent)
    try {
      const { sendOrderConfirmationEmail } = await import('@/lib/email/send')
      const { getOrderById } = await import('@/lib/db/orders')
      const fullOrder = await getOrderById(order.id)
      if (fullOrder) {
        await sendOrderConfirmationEmail(fullOrder)
        console.log('[Webhook] Confirmation email sent')
      }
    } catch (emailError) {
      console.error('[Webhook] Failed to send email:', emailError)
      // Don't fail the webhook if email fails
    }
  } catch (error) {
    console.error('[Webhook] Failed to update order:', error)
    throw error
  }
}

async function handleCheckoutExpired(session: any) {
  console.log('[Webhook] Checkout expired:', session.id)

  try {
    await sql`
      UPDATE orders
      SET status = 'failed', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE stripe_session_id = ${session.id}
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
      WHERE stripe_session_id = ${paymentIntent.id}
    `
  } catch (error) {
    console.error('[Webhook] Failed to mark payment as failed:', error)
  }
}
