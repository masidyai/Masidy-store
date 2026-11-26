import assert from 'node:assert/strict'
import { test } from 'node:test'
import { addShippingCountries } from '../lib/checkout/shipping-countries'

test('Stripe Checkout allows international Printful destinations and blocks restricted countries', () => {
  const params = new URLSearchParams()
  addShippingCountries(params)

  const countries = Array.from(params.entries())
    .filter(([key]) => key.startsWith('shipping_address_collection[allowed_countries]'))
    .map(([, country]) => country)

  assert.ok(countries.includes('EG'))
  assert.ok(countries.includes('IT'))
  assert.ok(countries.includes('BR'))
  assert.ok(countries.includes('US'))
  assert.ok(countries.includes('CA'))
  assert.ok(countries.includes('GB'))
  for (const restricted of ['BY', 'CU', 'EC', 'IR', 'KP', 'RU', 'SY']) {
    assert.ok(!countries.includes(restricted), `${restricted} must not be allowed`)
  }
})
