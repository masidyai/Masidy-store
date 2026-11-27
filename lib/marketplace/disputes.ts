export const MARKETPLACE_DISPUTE_TRANSFER_ERRORS = {
  openBlocked: 'Open payment dispute; payout blocked pending resolution.',
  openTransferred: 'Dispute requires manual transfer recovery review.',
  lostBlocked: 'Dispute lost; payout blocked.',
  lostTransferred: 'Dispute lost after transfer; manual recovery review required.',
} as const

export type MarketplaceDisputeStatus = 'open' | 'won' | 'lost'

export function getMarketplaceDisputeTransferError(
  status: MarketplaceDisputeStatus,
  transferred: boolean,
): string | null {
  if (status === 'won') return null
  if (status === 'open') {
    return transferred
      ? MARKETPLACE_DISPUTE_TRANSFER_ERRORS.openTransferred
      : MARKETPLACE_DISPUTE_TRANSFER_ERRORS.openBlocked
  }
  return transferred
    ? MARKETPLACE_DISPUTE_TRANSFER_ERRORS.lostTransferred
    : MARKETPLACE_DISPUTE_TRANSFER_ERRORS.lostBlocked
}
