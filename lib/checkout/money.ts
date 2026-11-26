const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF',
  'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF',
])

export function toMinorUnits(value: unknown, currency: string): number | null {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return null
  }
  const amount = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(amount) || amount < 0) return null
  return Math.round(amount * (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100))
}

export function fromMinorUnits(amount: number, currency: string): number {
  return amount / (ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase()) ? 1 : 100)
}
