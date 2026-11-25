import { render } from '@react-email/components'
import { Resend } from 'resend'
import { env } from 'cloudflare:workers'
import { OrderConfirmationEmail } from '@/components/emails/order-confirmation'
import { ShippingNotificationEmail } from '@/components/emails/shipping-notification'
import type { Order } from '@/lib/db/orders'
import { logEmail } from '@/lib/db/orders'

function getResendClient(): Resend | null {
  return env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null
}

export async function sendOrderConfirmationEmail(order: Order) {
  const resend = getResendClient()
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email')
    return
  }

  try {
    const orderUrl = `https://www.masidy.store/account/orders/${order.id}`
    const emailHtml = await render(OrderConfirmationEmail({ order, orderUrl }))

    const response = await resend.emails.send({
      from: 'orders@masidy.store',
      to: order.email,
      subject: `Order Confirmed - Masidy #${order.id.slice(0, 8)}`,
      html: emailHtml,
    })

    await logEmail('order_confirmation', order.email, 'Order Confirmed', order.userId, order.id)

    return response
  } catch (error) {
    console.error('[Email] Failed to send order confirmation:', error)
    await logEmail('order_confirmation', order.email, 'Order Confirmed - FAILED', order.userId, order.id)
    throw error
  }
}

export async function sendShippingNotificationEmail(
  order: Order,
  trackingNumber: string,
  trackingUrl: string,
  estimatedDelivery?: string,
) {
  const resend = getResendClient()
  if (!resend) {
    console.warn('[Email] RESEND_API_KEY not configured, skipping email')
    return
  }

  try {
    const customerName = order.shippingAddress?.name || order.email.split('@')[0]
    const emailHtml = await render(
      ShippingNotificationEmail({
        customerName,
        trackingNumber,
        trackingUrl,
        estimatedDelivery,
      }),
    )

    const response = await resend.emails.send({
      from: 'orders@masidy.store',
      to: order.email,
      subject: `Your order is on its way - Masidy #${order.id.slice(0, 8)}`,
      html: emailHtml,
    })

    await logEmail('shipping_notification', order.email, 'Order Shipped', order.userId, order.id)

    return response
  } catch (error) {
    console.error('[Email] Failed to send shipping notification:', error)
    await logEmail('shipping_notification', order.email, 'Order Shipped - FAILED', order.userId, order.id)
    throw error
  }
}
