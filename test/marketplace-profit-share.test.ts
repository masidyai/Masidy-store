import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  allocateProcessingFee,
  calculateResellerProfitShare,
} from '../lib/marketplace/profit-share'

test('processing fees are allocated proportionally without losing minor units', () => {
  const shares = allocateProcessingFee(101, 300, [100, 100, 100])
  assert.deepEqual(shares, [33, 33, 35])
  assert.equal(shares.reduce((total, amount) => total + amount, 0), 101)
})

test('reseller share is based on contribution after payment fees', () => {
  assert.deepEqual(calculateResellerProfitShare(500, 101, 5000), {
    profitBasisMinor: 399,
    amountMinor: 199,
  })
})

test('reseller share is zero when fees consume the full contribution', () => {
  assert.deepEqual(calculateResellerProfitShare(50, 51, 5000), {
    profitBasisMinor: 0,
    amountMinor: 0,
  })
})

test('fee allocation rejects seller totals that do not match the payment total', () => {
  assert.throws(() => allocateProcessingFee(10, 100, [90]), RangeError)
})
