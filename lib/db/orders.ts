import { createSecureId } from '@/lib/crypto'
import { sql } from './client'

export interface Order {
  id: string
  userId: string
  stripeSessionId?: string
  printfulOrderId?: string
  email: string
  status: 'pending' | 'confirmed' | 'failed' | 'canceled'
  items: OrderItem[]
  subtotal: number
  shippingCost: number
  tax: number
  total: number
  currency: string
  shippingAddress?: {
    name: string
    email: string
    address1: string
    address2?: string
    city: string
    state: string
    zip: string
    country: string
    phone?: string
  }
  shippingStatus?: 'pending' | 'in_transit' | 'delivered' | 'returned'
  trackingNumber?: string
  trackingUrl?: string
  createdAt: string
  updatedAt: string
}

export interface OrderItem {
  id: string
  productId: string
  variantId: string
  title: string
  color: string
  size: string
  image: string
  price: number
  quantity: number
  currency: string
}

export async function createOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) {
  const id = createSecureId()
  const now = new Date().toISOString()

  const result = await sql<OrderRow>`
    INSERT INTO orders (
      id, user_id, stripe_session_id, printful_order_id, email, status,
      items, subtotal, shipping_cost, tax, total, currency,
      shipping_address, created_at, updated_at
    ) VALUES (
      ${id}, ${order.userId},
      ${order.stripeSessionId || null}, ${order.printfulOrderId || null}, ${order.email}, ${order.status},
      ${JSON.stringify(order.items)}, ${order.subtotal}, ${order.shippingCost},
      ${order.tax}, ${order.total}, ${order.currency},
      ${order.shippingAddress ? JSON.stringify(order.shippingAddress) : null},
      ${now}, ${now}
    )
    RETURNING *
  `

  const row = result.rows[0]
  if (!row) throw new Error('Order creation did not return the created order.')
  return parseOrderRow(row)
}

export async function getOrdersByUserId(userId: string) {
  const result = await sql<OrderRow>`
    SELECT * FROM orders WHERE user_id = ${userId} ORDER BY created_at DESC
  `
  return result.rows.map((row) => parseOrderRow(row))
}

export async function getOrderById(orderId: string) {
  const result = await sql<OrderRow>`
    SELECT * FROM orders WHERE id = ${orderId}
  `
  return result.rows[0] ? parseOrderRow(result.rows[0]) : null
}

export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  shippingStatus?: Order['shippingStatus'],
  trackingNumber?: string,
  trackingUrl?: string,
) {
  const result = await sql<OrderRow>`
    UPDATE orders
    SET
      status = ${status},
      shipping_status = ${shippingStatus || null},
      tracking_number = ${trackingNumber || null},
      tracking_url = ${trackingUrl || null},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ${orderId}
    RETURNING *
  `
  return result.rows[0] ? parseOrderRow(result.rows[0]) : null
}

export async function logEmail(
  emailType: string,
  recipientEmail: string,
  subject: string,
  userId?: string,
  orderId?: string,
) {
  const id = createSecureId()
  await sql`
    INSERT INTO email_logs (id, user_id, order_id, email_type, recipient_email, subject)
    VALUES (${id}, ${userId || null}, ${orderId || null}, ${emailType}, ${recipientEmail}, ${subject})
  `
}

export async function markEmailAsSent(emailLogId: string) {
  await sql`UPDATE email_logs SET sent = TRUE WHERE id = ${emailLogId}`
}

type OrderRow = {
  id: string
  user_id: string
  stripe_session_id: string | null
  printful_order_id: string | null
  email: string
  status: Order['status']
  items: string | OrderItem[]
  subtotal: number | string
  shipping_cost: number | string
  tax: number | string
  total: number | string
  currency: string
  shipping_address: string | Order['shippingAddress'] | null
  shipping_status: Order['shippingStatus'] | null
  tracking_number: string | null
  tracking_url: string | null
  created_at: string
  updated_at: string
}

function parseOrderRow(row: OrderRow): Order {
  const items = typeof row.items === 'string' ? JSON.parse(row.items) as OrderItem[] : row.items
  if (!Array.isArray(items)) throw new TypeError('Order items are not a JSON array.')

  const shippingAddress =
    typeof row.shipping_address === 'string'
      ? JSON.parse(row.shipping_address) as Order['shippingAddress']
      : row.shipping_address ?? undefined

  return {
    id: row.id,
    userId: row.user_id,
    stripeSessionId: row.stripe_session_id ?? undefined,
    printfulOrderId: row.printful_order_id ?? undefined,
    email: row.email,
    status: row.status,
    items,
    subtotal: Number(row.subtotal),
    shippingCost: Number(row.shipping_cost),
    tax: Number(row.tax),
    total: Number(row.total),
    currency: row.currency,
    shippingAddress,
    shippingStatus: row.shipping_status ?? undefined,
    trackingNumber: row.tracking_number ?? undefined,
    trackingUrl: row.tracking_url ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}
