import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  getMarketplaceDisputeTransferError,
  MARKETPLACE_DISPUTE_TRANSFER_ERRORS,
} from '../lib/marketplace/disputes'

test('open and lost disputes distinguish blocked payouts from completed transfers', () => {
  assert.equal(getMarketplaceDisputeTransferError('open', false), MARKETPLACE_DISPUTE_TRANSFER_ERRORS.openBlocked)
  assert.equal(getMarketplaceDisputeTransferError('open', true), MARKETPLACE_DISPUTE_TRANSFER_ERRORS.openTransferred)
  assert.equal(getMarketplaceDisputeTransferError('lost', false), MARKETPLACE_DISPUTE_TRANSFER_ERRORS.lostBlocked)
  assert.equal(getMarketplaceDisputeTransferError('lost', true), MARKETPLACE_DISPUTE_TRANSFER_ERRORS.lostTransferred)
})

test('won disputes do not leave a payout recovery error', () => {
  assert.equal(getMarketplaceDisputeTransferError('won', false), null)
  assert.equal(getMarketplaceDisputeTransferError('won', true), null)
})
