export const MARKETPLACE_SELLER_COUNTRIES = [
  'AT', 'BE', 'BG', 'CH', 'CY', 'CZ', 'DE', 'DK', 'EE', 'ES', 'FI', 'FR',
  'GB', 'GR', 'HR', 'HU', 'IE', 'IT', 'LI', 'LT', 'LU', 'LV', 'MT', 'NL',
  'NO', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK',
] as const

export type MarketplaceSellerCountry = (typeof MARKETPLACE_SELLER_COUNTRIES)[number]

export function isMarketplaceSellerCountry(value: string): value is MarketplaceSellerCountry {
  return MARKETPLACE_SELLER_COUNTRIES.some((country) => country === value)
}
