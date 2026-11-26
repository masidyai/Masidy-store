import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Order } from '../lib/db/orders'
import { submitPaidOrder } from '../lib/printful/orders'

const paidOrder: Order = {
  id: 'order-123',
  userId: 'guest-123',
  stripeSessionId: 'pi_123',
  email: 'customer@example.com',
  status: 'confirmed',
  items: [{
    id: '84',
    productId: '42',
    variantId: '84',
    title: 'Masidy Tee',
    color: 'Black',
    size: 'M',
    image: 'https://example.com/tee.png',
    price: 26.49,
    quantity: 2,
    currency: 'EUR',
  }],
  subtotal: 52.98,
  shippingCost: 5.74,
  tax: 10.3,
  total: 69.02,
  currency: 'EUR',
  shippingAddress: {
    name: 'Customer',
    email: 'customer@example.com',
    address1: '12 Example Street',
    address2: 'Apartment 3',
    city: 'Rome',
    state: 'RM',
    zip: '00100',
    country: 'IT',
  },
  createdAt: '2026-11-26T00:00:00.000Z',
  updatedAt: '2026-11-26T00:00:00.000Z',
}

test('paid orders create one draft and confirm it for fulfillment', async () => {
  const originalFetch = globalThis.fetch
  const requests: Array<{ url: string; method: string; body?: Record<string, unknown> }> = []
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    const body = typeof init?.body === 'string'
      ? JSON.parse(init.body) as Record<string, unknown>
      : undefined
    requests.push({ url, method, body })

    if (method === 'GET') return Response.json({ code: 404 }, { status: 404 })
    if (url.endsWith('/orders')) {
      return Response.json({ result: { id: 501, status: 'draft' } })
    }
    return Response.json({ result: { id: 501, status: 'pending' } })
  }

  try {
    const orderId = await submitPaidOrder(paidOrder, 'STANDARD', 'test-token', 'store-1')
    assert.equal(orderId, '501')
    assert.equal(requests.length, 3)
    assert.equal(requests[0]?.url, 'https://api.printful.com/orders/@masidy-order-123')
    assert.equal(requests[1]?.method, 'POST')
    assert.equal(requests[1]?.body?.external_id, 'masidy-order-123')
    assert.equal(requests[1]?.body?.shipping, 'STANDARD')
    assert.deepEqual(requests[1]?.body?.items, [{
      sync_variant_id: 84,
      quantity: 2,
      retail_price: '26.49',
    }])
    assert.equal(requests[1]?.body?.retail_costs && (
      requests[1]?.body?.retail_costs as Record<string, unknown>
    ).currency, 'EUR')
    assert.equal(requests[2]?.url, 'https://api.printful.com/orders/501/confirm')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('webhook retries find the existing order instead of creating or confirming it again', async () => {
  const originalFetch = globalThis.fetch
  let requestCount = 0
  globalThis.fetch = async () => {
    requestCount += 1
    return Response.json({ result: { id: 501, status: 'pending' } })
  }

  try {
    assert.equal(await submitPaidOrder(paidOrder, 'STANDARD', 'test-token', 'store-1'), '501')
    assert.equal(requestCount, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('a lost confirmation response is recovered from the order status on retry', async () => {
  const originalFetch = globalThis.fetch
  let confirmationAttempted = false
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    if (url.endsWith('/orders/@masidy-order-123')) {
      return Response.json({ code: 404 }, { status: 404 })
    }
    if (url.endsWith('/orders') && init?.method === 'POST') {
      return Response.json({ result: { id: 501, status: 'draft' } })
    }
    if (url.endsWith('/orders/501/confirm')) {
      confirmationAttempted = true
      return Response.json({ error: 'network timeout' }, { status: 500 })
    }
    return Response.json({ result: { id: 501, status: 'pending' } })
  }

  try {
    assert.equal(await submitPaidOrder(paidOrder, 'STANDARD', 'test-token', 'store-1'), '501')
    assert.equal(confirmationAttempted, true)
  } finally {
    globalThis.fetch = originalFetch
  }
})
