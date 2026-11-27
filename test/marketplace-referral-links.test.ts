import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getSafeReferralDestination } from '../lib/marketplace/referral-links'

test('reseller links can target Masidy catalog and marketplace pages', () => {
  assert.equal(getSafeReferralDestination('/search'), '/search')
  assert.equal(getSafeReferralDestination('/product/123'), '/product/123')
  assert.equal(
    getSafeReferralDestination('/marketplace/product/abc?color=blue'),
    '/marketplace/product/abc?color=blue',
  )
})

test('reseller links reject external and non-store destinations', () => {
  assert.equal(getSafeReferralDestination('https://example.com'), '/search')
  assert.equal(getSafeReferralDestination('//example.com'), '/search')
  assert.equal(getSafeReferralDestination('/admin'), '/search')
  assert.equal(getSafeReferralDestination('/%5c%5cexample.com'), '/search')
  assert.equal(getSafeReferralDestination(null), '/search')
})
