export function allocateProcessingFee(
  feeMinor: number,
  orderTotalMinor: number,
  sellerGrossMinor: number[],
): number[] {
  if (
    !Number.isSafeInteger(feeMinor) ||
    feeMinor < 0 ||
    !Number.isSafeInteger(orderTotalMinor) ||
    orderTotalMinor < 1 ||
    sellerGrossMinor.length === 0 ||
    sellerGrossMinor.some((amount) => !Number.isSafeInteger(amount) || amount < 0)
  ) {
    throw new RangeError('Marketplace seller totals must reconcile to a valid payment amount.')
  }
  const grossTotalMinor = sellerGrossMinor.reduce((total, amount) => total + BigInt(amount), 0n)
  if (grossTotalMinor !== BigInt(orderTotalMinor)) {
    throw new RangeError('Marketplace seller totals must reconcile to a valid payment amount.')
  }

  let allocated = 0
  return sellerGrossMinor.map((grossMinor, index) => {
    const feeShare = index === sellerGrossMinor.length - 1
      ? feeMinor - allocated
      : Number(BigInt(feeMinor) * BigInt(grossMinor) / BigInt(orderTotalMinor))
    allocated += feeShare
    return feeShare
  })
}

export function calculateResellerProfitShare(
  commissionMinor: number,
  processingFeeMinor: number,
  rateBps: number,
): { profitBasisMinor: number; amountMinor: number } {
  if (
    !Number.isSafeInteger(commissionMinor) ||
    commissionMinor < 0 ||
    !Number.isSafeInteger(processingFeeMinor) ||
    processingFeeMinor < 0 ||
    !Number.isSafeInteger(rateBps) ||
    rateBps < 0 ||
    rateBps > 10000
  ) {
    throw new RangeError('Marketplace profit-share inputs are invalid.')
  }

  const profitBasisMinor = Math.max(0, commissionMinor - processingFeeMinor)
  const amountMinor = Number(BigInt(profitBasisMinor) * BigInt(rateBps) / 10000n)
  return { profitBasisMinor, amountMinor }
}
