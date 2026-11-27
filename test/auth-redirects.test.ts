import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getSafePostLoginRedirect } from '../lib/auth/redirects'

test('login returns users to a safe internal requested route', () => {
  assert.equal(getSafePostLoginRedirect('/account/seller'), '/account/seller')
  assert.equal(getSafePostLoginRedirect('/account/reseller?tab=earnings'), '/account/reseller?tab=earnings')
})

test('login rejects external and recursive redirect destinations', () => {
  assert.equal(getSafePostLoginRedirect('https://example.com'), '/account')
  assert.equal(getSafePostLoginRedirect('//example.com'), '/account')
  assert.equal(getSafePostLoginRedirect('/login?redirect=/account/seller'), '/account')
  assert.equal(getSafePostLoginRedirect(null), '/account')
})
