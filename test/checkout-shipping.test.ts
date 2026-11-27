import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  estimatePrintfulOrderCosts,
  getPrintfulCustomerTotals,
  getPrintfulItemPrice,
  getOrderTotals,
  getPricedCheckoutItems,
  getPrintfulShippingRates,
  parseCheckoutAddress,
  parseCheckoutItems,
} from '../lib/checkout/printful'
import { fromMinorUnits, toMinorUnits } from '../lib/checkout/money'
import {
  calculateStripeTax,
  recordStripeTaxTransaction,
} from '../lib/checkout/stripe-tax'

test('checkout parsing accepts international addresses without optional postal fields', () => {
  const items = parseCheckoutItems([{
    productId: '42',
    variantId: '84',
    quantity: 2,
    price: 0.01,
    title: 'T-shirt',
  }])
  const address = parseCheckoutAddress({
    name: 'Customer',
    email: 'customer@example.com',
    address1: '12 Example Street',
    city: 'Cairo',
    country: 'EG',
  })

  assert.equal(items?.[0]?.quantity, 2)
  assert.equal('price' in (items?.[0] ?? {}), false)
  assert.equal(address?.country, 'EG')
  assert.equal(address?.state, undefined)
  assert.equal(address?.zip, undefined)
  assert.equal(parseCheckoutItems([{ productId: '42', variantId: '84', quantity: 100 }]), null)
})

test('Printful catalog variant and shipping rates determine checkout charges', async () => {
  const originalFetch = globalThis.fetch
  let shippingRequest: Record<string, unknown> | undefined
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    if (url.endsWith('/store/products/42')) {
      return Response.json({
        result: {
          sync_product: { id: 42, name: 'Masidy Tee' },
          sync_variants: [{
            id: 84,
            variant_id: 501,
            name: 'Black / M',
            retail_price: '25.99',
            currency: 'USD',
          }],
        },
      })
    }

    assert.ok(url.endsWith('/shipping/rates'))
    shippingRequest = JSON.parse(String(init?.body)) as Record<string, unknown>
    return Response.json({
      result: [{
        id: 'STANDARD',
        name: 'Standard',
        rate: '6.45',
        currency: 'USD',
        minDeliveryDays: 5,
        maxDeliveryDays: 10,
      }],
    })
  }

  try {
    const items = parseCheckoutItems([{
      productId: '42',
      variantId: '84',
      quantity: 2,
      price: 0.01,
      currency: 'EUR',
      title: 'Forged product title',
    }])
    const address = parseCheckoutAddress({
      name: 'Customer',
      email: 'customer@example.com',
      address1: '12 Example Street',
      city: 'Cairo',
      country: 'EG',
    })
    assert.ok(items)
    assert.ok(address)

    const pricedItems = await getPricedCheckoutItems(items, 'test-token', 'store-1')
    assert.equal(pricedItems[0]?.price, 25.99)
    assert.equal(pricedItems[0]?.title, 'Masidy Tee')
    assert.equal(pricedItems[0]?.printfulVariantId, 501)

    const rates = await getPrintfulShippingRates(pricedItems, address, 'test-token', 'store-1')
    const requestItems = shippingRequest?.items as Array<{ variant_id: number; quantity: number }>
    assert.deepEqual(requestItems, [{ variant_id: 501, quantity: 2 }])
    assert.equal(rates[0]?.amountCents, 645)
    assert.deepEqual(getOrderTotals(pricedItems, rates[0]!.amountCents, 520), {
      currency: 'USD',
      subtotalCents: 5198,
      taxCents: 520,
      shippingCents: 645,
      totalCents: 6363,
    })
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Printful order estimates include fulfillment fees and a fixed per-item markup', async () => {
  const originalFetch = globalThis.fetch
  let estimateRequest: Record<string, unknown> | undefined
  globalThis.fetch = async (input, init) => {
    assert.ok(String(input).endsWith('/orders/estimate-costs'))
    estimateRequest = JSON.parse(String(init?.body)) as Record<string, unknown>
    return Response.json({
      result: {
        costs: {
          currency: 'USD',
          subtotal: 50,
          discount: 1,
          shipping: 6.45,
          digitization: 3,
          additional_fee: 0.75,
          fulfillment_fee: 0,
          retail_delivery_fee: 0,
          tax: 0.5,
          vat: 0,
          total: 59.7,
        },
      },
    })
  }

  try {
    const items = parseCheckoutItems([{ productId: '42', variantId: '84', quantity: 2 }])
    const address = parseCheckoutAddress({
      name: 'Customer',
      email: 'customer@example.com',
      address1: '12 Example Street',
      city: 'Cairo',
      country: 'EG',
    })
    assert.ok(items)
    assert.ok(address)
    const pricedItems = [{
      ...items[0]!,
      id: items[0]!.variantId,
      price: 25.99,
      priceCents: 2599,
      currency: 'USD',
      printfulVariantId: 501,
    }]

    const estimate = await estimatePrintfulOrderCosts(
      pricedItems,
      address,
      'EXPRESS',
      'test-token',
      'store-1',
    )
    assert.deepEqual(estimate, {
      currency: 'USD',
      subtotalCents: 4900,
      discountCents: 100,
      shippingCents: 645,
      digitizationCents: 300,
      taxCents: 50,
      otherFeesCents: 75,
      totalCents: 5970,
    })
    assert.deepEqual(estimateRequest?.items, [{ sync_variant_id: 84, quantity: 2 }])
    assert.equal(estimateRequest?.shipping, 'EXPRESS')
    assert.deepEqual(getPrintfulCustomerTotals(estimate, 2), {
      currency: 'USD',
      subtotalCents: 5900,
      shippingCents: 645,
      digitizationCents: 300,
      taxCents: 50,
      otherFeesCents: 75,
      totalCents: 6970,
    })
    assert.equal(await getPrintfulItemPrice(pricedItems[0]!, address, 'test-token', 'store-1'), 2950)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('two-item EUR estimate adds the configured markup to the Printful total', () => {
  const estimate = {
    currency: 'EUR',
    subtotalCents: 2951,
    discountCents: 0,
    shippingCents: 574,
    digitizationCents: 1150,
    taxCents: 1030,
    otherFeesCents: 0,
    totalCents: 5705,
  }

  assert.deepEqual(getPrintfulCustomerTotals(estimate, 2), {
    currency: 'EUR',
    subtotalCents: 3951,
    shippingCents: 574,
    digitizationCents: 1150,
    taxCents: 1030,
    otherFeesCents: 0,
    totalCents: 6705,
  })
})

test('Stripe Tax calculates tax using the destination address and Printful shipping cost', async () => {
  const originalFetch = globalThis.fetch
  let taxRequest: URLSearchParams | undefined
  globalThis.fetch = async (_input, init) => {
    taxRequest = new URLSearchParams(String(init?.body))
    return Response.json({
      id: 'taxcalc_test',
      amount_total: 6363,
      tax_amount_exclusive: 520,
      tax_amount_inclusive: 0,
      currency: 'usd',
    })
  }

  try {
    const items = parseCheckoutItems([{
      productId: '42',
      variantId: '84',
      quantity: 2,
    }])
    assert.ok(items)
    const pricedItems = [{
      ...items[0]!,
      id: items[0]!.variantId,
      price: 25.99,
      priceCents: 2599,
      currency: 'USD',
      printfulVariantId: 501,
    }]
    const address = parseCheckoutAddress({
      name: 'Customer',
      email: 'customer@example.com',
      address1: '12 Example Street',
      city: 'Cairo',
      country: 'EG',
    })
    assert.ok(address)

    const calculation = await calculateStripeTax('stripe-test-key', pricedItems, address, 645, 'USD')
    assert.equal(calculation.taxCents, 520)
    assert.equal(calculation.totalCents, 6363)
    assert.equal(taxRequest?.get('customer_details[address][country]'), 'EG')
    assert.equal(taxRequest?.get('customer_details[address_source]'), 'shipping')
    assert.equal(taxRequest?.get('line_items[0][amount]'), '5198')
    assert.equal(taxRequest?.get('line_items[0][quantity]'), '2')
    assert.equal(taxRequest?.get('shipping_cost[amount]'), '645')
    assert.equal(taxRequest?.get('line_items[0][tax_behavior]'), 'exclusive')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('Stripe Tax keeps tax-inclusive item and shipping prices at the listed total', async () => {
  const originalFetch = globalThis.fetch
  let taxRequest: URLSearchParams | undefined
  globalThis.fetch = async (_input, init) => {
    taxRequest = new URLSearchParams(String(init?.body))
    return Response.json({
      id: 'taxcalc_inclusive',
      amount_total: 2500,
      tax_amount_exclusive: 0,
      tax_amount_inclusive: 250,
      currency: 'eur',
    })
  }

  try {
    const address = parseCheckoutAddress({
      name: 'Customer',
      email: 'customer@example.com',
      address1: '12 Example Street',
      city: 'Rome',
      country: 'IT',
    })
    assert.ok(address)
    const calculation = await calculateStripeTax(
      'stripe-test-key',
      [{ variantId: 'listing-1', quantity: 1, priceCents: 2000, taxBehavior: 'inclusive' }],
      address,
      500,
      'EUR',
      'inclusive',
    )
    assert.equal(calculation.taxCents, 250)
    assert.equal(calculation.totalCents, 2500)
    assert.equal(taxRequest?.get('line_items[0][tax_behavior]'), 'inclusive')
    assert.equal(taxRequest?.get('shipping_cost[tax_behavior]'), 'inclusive')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('minor-unit conversion handles zero-decimal currencies and rejects invalid amounts', () => {
  assert.equal(toMinorUnits('500', 'JPY'), 500)
  assert.equal(fromMinorUnits(500, 'JPY'), 500)
  assert.equal(toMinorUnits('not-a-price', 'USD'), null)
  assert.equal(toMinorUnits(null, 'USD'), null)
})

test('Stripe Tax transaction creation is idempotent for webhook retries', async () => {
  const originalFetch = globalThis.fetch
  let requestUrl = ''
  let requestHeaders: Headers | undefined
  let requestBody = ''
  globalThis.fetch = async (input, init) => {
    requestUrl = String(input)
    requestHeaders = new Headers(init?.headers)
    requestBody = String(init?.body)
    return Response.json({ id: 'tax_transaction_test' })
  }

  try {
    await recordStripeTaxTransaction(
      'stripe-test-key',
      'taxcalc_test',
      'order-123',
      'pi_test',
    )
    assert.ok(requestUrl.endsWith('/tax/transactions/create_from_calculation'))
    assert.equal(requestHeaders?.get('Idempotency-Key'), 'tax-transaction-pi_test')
    assert.equal(new URLSearchParams(requestBody).get('calculation'), 'taxcalc_test')
    assert.equal(new URLSearchParams(requestBody).get('reference'), 'order-123')
  } finally {
    globalThis.fetch = originalFetch
  }
})
