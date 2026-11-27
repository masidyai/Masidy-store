import { getMarketplaceCheckoutListings } from './db'
import { isMarketplaceSellerCountry } from './countries'
import { calculateStripeTax, StripeTaxError } from '@/lib/checkout/stripe-tax'
import { parseCheckoutAddress, type CheckoutAddress } from '@/lib/checkout/printful'
import type { PublicSellerListing } from './db'

const APPROVED_TAX_CODES = new Set(['txcd_99999999', 'txcd_30011000'])

export class MarketplaceCheckoutError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'MarketplaceCheckoutError'
  }
}

export interface MarketplaceCheckoutItemInput {
  listingId: string
  quantity: number
}

export interface MarketplaceCheckoutLine {
  listing: PublicSellerListing
  sellerUserId: string
  quantity: number
  shippingMinor: number
  taxCode: string
}

export interface MarketplaceSellerTax {
  sellerUserId: string
  taxCalculationId: string
  taxMinor: number
  totalMinor: number
}

export interface MarketplaceCheckoutQuote {
  address: CheckoutAddress
  lines: MarketplaceCheckoutLine[]
  currency: string
  subtotalMinor: number
  shippingMinor: number
  taxMinor: number
  totalMinor: number
  taxCalculationId: string
  sellerTaxes: MarketplaceSellerTax[]
}

export function parseMarketplaceCheckoutItems(value: unknown): MarketplaceCheckoutItemInput[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 30) return null
  const seen = new Set<string>()
  const items: MarketplaceCheckoutItemInput[] = []
  for (const candidate of value) {
    if (!isRecord(candidate) || typeof candidate.listingId !== 'string') return null
    const listingId = candidate.listingId.trim()
    const quantity = candidate.quantity
    if (
      !listingId ||
      listingId.length > 120 ||
      seen.has(listingId) ||
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 20
    ) return null
    seen.add(listingId)
    items.push({ listingId, quantity })
  }
  return items
}

export async function createMarketplaceCheckoutQuote(
  items: MarketplaceCheckoutItemInput[],
  addressValue: unknown,
  stripeSecretKey: string,
): Promise<MarketplaceCheckoutQuote> {
  const address = parseCheckoutAddress(addressValue)
  if (!address || !isMarketplaceSellerCountry(address.country)) {
    throw new MarketplaceCheckoutError('Enter a valid delivery address in a supported country.', 400)
  }

  const allListings = await getMarketplaceCheckoutListings()
  const listingsById = new Map(allListings.map((entry) => [entry.listing.id, entry]))
  const lines: MarketplaceCheckoutLine[] = items.map((item) => {
    const entry = listingsById.get(item.listingId)
    if (!entry || !entry.listing.taxCode || !APPROVED_TAX_CODES.has(entry.listing.taxCode)) {
      throw new MarketplaceCheckoutError('A product in your bag is no longer available.', 409)
    }
    const shippingZone = entry.listing.shippingZones.find((zone) => zone.country === address.country)
    if (!shippingZone) {
      throw new MarketplaceCheckoutError(
        `A seller does not ship to ${address.country}. Remove that product or choose another delivery country.`,
        400,
      )
    }
    return {
      listing: entry.listing,
      sellerUserId: entry.sellerUserId,
      quantity: item.quantity,
      shippingMinor: shippingZone.amountMinor,
      taxCode: entry.listing.taxCode,
    }
  })

  const currency = lines[0].listing.currency
  if (lines.some((line) => line.listing.currency !== currency)) {
    throw new MarketplaceCheckoutError('All products in one marketplace order must use the same currency.', 400)
  }

  const subtotalMinor = lines.reduce(
    (sum, line) => sum + line.listing.priceMinor * line.quantity,
    0,
  )
  const shippingMinor = lines.reduce(
    (sum, line) => sum + line.shippingMinor * line.quantity,
    0,
  )
  if (!Number.isSafeInteger(subtotalMinor) || !Number.isSafeInteger(shippingMinor)) {
    throw new MarketplaceCheckoutError('The order total is too large to process.', 400)
  }

  try {
    const linesBySeller = new Map<string, MarketplaceCheckoutLine[]>()
    for (const line of lines) {
      const sellerLines = linesBySeller.get(line.sellerUserId) ?? []
      sellerLines.push(line)
      linesBySeller.set(line.sellerUserId, sellerLines)
    }

    const sellerTaxes: MarketplaceSellerTax[] = []
    for (const [sellerUserId, sellerLines] of linesBySeller) {
      const sellerShippingMinor = sellerLines.reduce(
        (sum, line) => sum + line.shippingMinor * line.quantity,
        0,
      )
      const tax = await calculateStripeTax(
        stripeSecretKey,
        sellerLines.map((line) => ({
          variantId: line.listing.id,
          quantity: line.quantity,
          priceCents: line.listing.priceMinor,
          taxCode: line.taxCode,
          taxBehavior: 'inclusive',
        })),
        address,
        sellerShippingMinor,
        currency,
        'inclusive',
      )
      sellerTaxes.push({
        sellerUserId,
        taxCalculationId: tax.id,
        taxMinor: tax.taxCents,
        totalMinor: tax.totalCents,
      })
    }

    const taxMinor = sellerTaxes.reduce((sum, sellerTax) => sum + sellerTax.taxMinor, 0)
    const totalMinor = sellerTaxes.reduce((sum, sellerTax) => sum + sellerTax.totalMinor, 0)
    if (!Number.isSafeInteger(taxMinor) || !Number.isSafeInteger(totalMinor)) {
      throw new MarketplaceCheckoutError('The order total is too large to process.', 400)
    }
    return {
      address,
      lines,
      currency,
      subtotalMinor,
      shippingMinor,
      taxMinor,
      totalMinor,
      taxCalculationId: sellerTaxes[0].taxCalculationId,
      sellerTaxes,
    }
  } catch (error) {
    if (error instanceof StripeTaxError) {
      throw new MarketplaceCheckoutError(error.message, error.status)
    }
    throw error
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
