import type { Order } from '@/lib/db/orders'
import { fromMinorUnits, toMinorUnits } from '@/lib/checkout/money'

const PRINTFUL_API_BASE = 'https://api.printful.com'

interface PrintfulOrder {
  id: string
  status: string
}

export async function submitPaidOrder(
  order: Order,
  shippingMethod: string,
  token: string,
  storeId?: string,
): Promise<string> {
  if (!order.shippingAddress) throw new Error('Paid order is missing its shipping address.')
  if (!shippingMethod) throw new Error('Paid order is missing its selected shipping method.')
  if (order.items.length === 0) throw new Error('Paid order has no items to fulfill.')

  const externalId = `masidy-${order.id}`
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  if (storeId) headers['X-PF-Store-Id'] = storeId

  const existing = await getOrderByExternalId(externalId, headers)
  const printfulOrder = existing ?? await createOrder(order, externalId, shippingMethod, headers)

  if (printfulOrder.status === 'draft') {
    const response = await fetch(
      `${PRINTFUL_API_BASE}/orders/${encodeURIComponent(printfulOrder.id)}/confirm`,
      { method: 'POST', headers },
    )
    if (!response.ok) {
      const current = await getOrderById(printfulOrder.id, headers)
      if (!current || !isSubmittedStatus(current.status)) {
        throw new Error(`Printful order confirmation failed (${response.status}).`)
      }
      return current.id
    }

    const confirmed = await parseOrderResponse(response)
    if (confirmed.id !== printfulOrder.id || !isSubmittedStatus(confirmed.status)) {
      throw new Error(`Printful did not submit the paid order for fulfillment (${confirmed.status}).`)
    }
    return confirmed.id
  }

  if (!isSubmittedStatus(printfulOrder.status)) {
    throw new Error(`Paid order has an unexpected fulfillment status: ${printfulOrder.status}.`)
  }
  return printfulOrder.id
}

async function getOrderByExternalId(
  externalId: string,
  headers: Record<string, string>,
): Promise<PrintfulOrder | null> {
  const response = await fetch(
    `${PRINTFUL_API_BASE}/orders/@${encodeURIComponent(externalId)}`,
    { headers },
  )
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Printful order lookup failed (${response.status}).`)
  return parseOrderResponse(response)
}

async function getOrderById(
  orderId: string,
  headers: Record<string, string>,
): Promise<PrintfulOrder | null> {
  const response = await fetch(`${PRINTFUL_API_BASE}/orders/${encodeURIComponent(orderId)}`, { headers })
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Printful order lookup failed (${response.status}).`)
  return parseOrderResponse(response)
}

async function createOrder(
  order: Order,
  externalId: string,
  shippingMethod: string,
  headers: Record<string, string>,
): Promise<PrintfulOrder> {
  const currency = order.currency.toUpperCase()
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error('Paid order has an invalid currency.')

  const items = order.items.map((item, index) => {
    const syncVariantId = Number(item.variantId)
    const price = toAmountString(item.price, currency)
    if (
      !Number.isSafeInteger(syncVariantId) ||
      syncVariantId < 1 ||
      !Number.isInteger(item.quantity) ||
      item.quantity < 1 ||
      item.currency.toUpperCase() !== currency ||
      price === null
    ) {
      throw new Error(`Paid order contains an invalid item at position ${index + 1}.`)
    }
    return {
      sync_variant_id: syncVariantId,
      quantity: item.quantity,
      retail_price: price,
    }
  })
  const retailSubtotal = toAmountString(order.subtotal, currency)
  const retailShipping = toAmountString(order.shippingCost, currency)
  const retailTax = toAmountString(order.tax, currency)
  if (retailSubtotal === null || retailShipping === null || retailTax === null) {
    throw new Error('Paid order contains invalid retail totals.')
  }

  const address = order.shippingAddress
  const response = await fetch(`${PRINTFUL_API_BASE}/orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      external_id: externalId,
      shipping: shippingMethod,
      recipient: {
        name: address.name,
        email: order.email,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        state_code: address.state || undefined,
        country_code: address.country,
        zip: address.zip || undefined,
        phone: address.phone,
      },
      items,
      retail_costs: {
        currency,
        subtotal: retailSubtotal,
        shipping: retailShipping,
        tax: retailTax,
      },
    }),
  })
  if (!response.ok) throw new Error(`Printful order creation failed (${response.status}).`)
  return parseOrderResponse(response)
}

async function parseOrderResponse(response: Response): Promise<PrintfulOrder> {
  const payload: unknown = await response.json()
  if (!isRecord(payload) || !isRecord(payload.result)) {
    throw new Error('Printful returned an invalid order response.')
  }
  const result = payload.result
  const id = typeof result.id === 'number' && Number.isSafeInteger(result.id) && result.id > 0
    ? String(result.id)
    : typeof result.id === 'string' && /^\d+$/.test(result.id)
      ? result.id
      : ''
  if (!id || typeof result.status !== 'string') {
    throw new Error('Printful returned an incomplete order response.')
  }
  return { id, status: result.status.toLowerCase() }
}

function toAmountString(amount: number, currency: string): string | null {
  const minorUnits = toMinorUnits(amount, currency)
  return minorUnits === null ? null : String(fromMinorUnits(minorUnits, currency))
}

function isSubmittedStatus(status: string): boolean {
  return ['pending', 'inprocess', 'partial', 'fulfilled', 'onhold'].includes(status)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
