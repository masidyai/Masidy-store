import assert from 'node:assert/strict'
import { test } from 'node:test'
import { isPrintfulShippingCountry, PRINTFUL_SHIPPING_COUNTRIES } from '../lib/checkout/shipping-countries'

test('shipping country list includes international destinations and excludes restricted countries', () => {
  assert.ok(PRINTFUL_SHIPPING_COUNTRIES.includes('EG'))
  assert.ok(PRINTFUL_SHIPPING_COUNTRIES.includes('IT'))
  assert.ok(PRINTFUL_SHIPPING_COUNTRIES.includes('BR'))
  assert.ok(PRINTFUL_SHIPPING_COUNTRIES.includes('US'))
  assert.ok(PRINTFUL_SHIPPING_COUNTRIES.includes('CA'))
  assert.ok(PRINTFUL_SHIPPING_COUNTRIES.includes('GB'))
  for (const restricted of ['BY', 'CU', 'EC', 'IR', 'KP', 'RU', 'SY']) {
    assert.ok(!isPrintfulShippingCountry(restricted), `${restricted} must not be allowed`)
  }
})
