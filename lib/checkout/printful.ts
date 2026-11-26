import type { OrderItem } from '@/lib/db/orders'
import { fromMinorUnits, toMinorUnits } from './money'

export { fromMinorUnits, toMinorUnits } from './money'

export interface CheckoutAddress {
  name: string
  email: string
  address1: string
  address2?: string
  city: string
  state?: string
  zip?: string
  country: string
  phone?: string
}

export interface CheckoutCartItem {
  productId: string
  variantId: string
  title: string
  color: string
  size: string
  image: string
  quantity: number
}

export interface PricedCheckoutItem extends OrderItem {
  printfulVariantId: number
  priceCents: number
}

export interface PrintfulShippingRate {
  id: string
  name: string
  amountCents: number
  currency: string
  minDeliveryDays?: number
  maxDeliveryDays?: number
}

export interface PrintfulOrderCostEstimate {
  currency: string
  subtotalCents: number
  discountCents: number
  shippingCents: number
  digitizationCents: number
  taxCents: number
  otherFeesCents: number
  totalCents: number
}

interface PrintfulSyncVariant {
  id: number
  variant_id: number
  name: string
  retail_price: string
  currency: string
}

const PRINTFUL_API_BASE = 'https://api.printful.com'
export const PRINTFUL_MARKUP_CENTS_PER_ITEM = 500

export function parseCheckoutItems(value: unknown): CheckoutCartItem[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) return null

  const items: CheckoutCartItem[] = []
  for (const candidate of value) {
    if (!isRecord(candidate)) return null
    const productId = positiveIntegerString(candidate.productId)
    const variantId = positiveIntegerString(candidate.variantId)
    const quantity = candidate.quantity
    if (
      !productId ||
      !variantId ||
      typeof quantity !== 'number' ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 99
    ) {
      return null
    }

    items.push({
      productId,
      variantId,
      title: safeText(candidate.title, 200),
      color: safeText(candidate.color, 100),
      size: safeText(candidate.size, 100),
      image: safeText(candidate.image, 2048),
      quantity,
    })
  }

  return items
}

export function parseCheckoutAddress(value: unknown): CheckoutAddress | null {
  if (!isRecord(value)) return null
  const name = safeText(value.name, 200)
  const email = safeText(value.email, 320)
  const address1 = safeText(value.address1, 200)
  const city = safeText(value.city, 120)
  const country = safeText(value.country, 2).toUpperCase()

  if (
    !name ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !address1 ||
    !city ||
    !/^[A-Z]{2}$/.test(country)
  ) {
    return null
  }

  return {
    name,
    email,
    address1,
    address2: safeText(value.address2, 200) || undefined,
    city,
    state: safeText(value.state, 120) || undefined,
    zip: safeText(value.zip, 40) || undefined,
    country,
    phone: safeText(value.phone, 40) || undefined,
  }
}

export async function getPricedCheckoutItems(
  items: CheckoutCartItem[],
  token: string,
  storeId?: string,
): Promise<PricedCheckoutItem[]> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (storeId) headers['X-PF-Store-Id'] = storeId

  const productIds = [...new Set(items.map((item) => item.productId))]
  const products = await Promise.all(
    productIds.map(async (productId) => {
      const response = await fetch(`${PRINTFUL_API_BASE}/store/products/${productId}`, { headers })
      if (!response.ok) {
        throw new Error(`Printful product lookup failed (${response.status}).`)
      }

      const payload: unknown = await response.json()
      if (!isRecord(payload) || !isRecord(payload.result)) {
        throw new Error('Printful returned an invalid product response.')
      }
      const result = payload.result
      if (!isRecord(result) || !isRecord(result.sync_product) || !Array.isArray(result.sync_variants)) {
        throw new Error('Printful returned an invalid product response.')
      }
      const product = result.sync_product
      if (product.id !== Number(productId) || typeof product.name !== 'string') {
        throw new Error('Printful returned an invalid product response.')
      }

      const variants = result.sync_variants.filter(isPrintfulSyncVariant)
      return [
        productId,
        {
          sync_product: { id: product.id, name: product.name },
          sync_variants: variants,
        },
      ] as const
    }),
  )
  const productsById = new Map(products)

  return items.map((item) => {
    const product = productsById.get(item.productId)
    const variant = product?.sync_variants.find((candidate) => candidate.id === Number(item.variantId))
    if (!product || !variant || !Number.isInteger(variant.variant_id) || variant.variant_id < 1) {
      throw new Error('A product in your cart is no longer available.')
    }

    const currency = variant.currency.toUpperCase()
    const priceCents = toMinorUnits(variant.retail_price, currency)
    if (!priceCents || priceCents < 1 || !/^[A-Z]{3}$/.test(currency)) {
      throw new Error('Printful returned an invalid product price.')
    }

    return {
      id: item.variantId,
      productId: item.productId,
      variantId: item.variantId,
      title: product.sync_product.name,
      color: item.color,
      size: item.size,
      image: item.image,
      price: fromMinorUnits(priceCents, currency),
      priceCents,
      quantity: item.quantity,
      currency,
      printfulVariantId: variant.variant_id,
    }
  })
}

export async function getPrintfulShippingRates(
  items: PricedCheckoutItem[],
  address: CheckoutAddress,
  token: string,
  storeId?: string,
): Promise<PrintfulShippingRate[]> {
  const currencies = new Set(items.map((item) => item.currency))
  if (currencies.size !== 1) {
    throw new Error('Items in your cart use different currencies.')
  }
  const currency = items[0]?.currency
  if (!currency) throw new Error('Your cart is empty.')

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  if (storeId) headers['X-PF-Store-Id'] = storeId

  const response = await fetch(`${PRINTFUL_API_BASE}/shipping/rates`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      recipient: {
        name: address.name,
        email: address.email,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        state_code: address.state,
        country_code: address.country,
        zip: address.zip,
        phone: address.phone,
      },
      items: items.map((item) => ({
        variant_id: item.printfulVariantId,
        quantity: item.quantity,
      })),
      currency,
      locale: 'en_US',
    }),
  })
  if (!response.ok) {
    throw new Error(`Printful shipping quote failed (${response.status}).`)
  }

  const payload: unknown = await response.json()
  if (!isRecord(payload) || !Array.isArray(payload.result)) {
    throw new Error('Printful returned an invalid shipping response.')
  }

  const rates = payload.result.flatMap((candidate): PrintfulShippingRate[] => {
    if (!isRecord(candidate)) return []
    const rateCurrency = typeof candidate.currency === 'string'
      ? candidate.currency.toUpperCase()
      : currency
    const amountCents = rateCurrency === currency ? toMinorUnits(candidate.rate, currency) : null
    if (
      typeof candidate.id !== 'string' ||
      typeof candidate.name !== 'string' ||
      amountCents === null ||
      amountCents < 0
    ) {
      return []
    }
    return [{
      id: candidate.id,
      name: candidate.name,
      amountCents,
      currency,
      minDeliveryDays: positiveNumber(candidate.minDeliveryDays),
      maxDeliveryDays: positiveNumber(candidate.maxDeliveryDays),
    }]
  })

  return rates
}

export async function estimatePrintfulOrderCosts(
  items: PricedCheckoutItem[],
  address: CheckoutAddress,
  shipping: string,
  token: string,
  storeId?: string,
): Promise<PrintfulOrderCostEstimate> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  }
  if (storeId) headers['X-PF-Store-Id'] = storeId

  const response = await fetch(`${PRINTFUL_API_BASE}/orders/estimate-costs`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      shipping,
      recipient: {
        name: address.name,
        email: address.email,
        address1: address.address1,
        address2: address.address2,
        city: address.city,
        state_code: address.state,
        country_code: address.country,
        zip: address.zip,
        phone: address.phone,
      },
      items: items.map((item) => ({
        sync_variant_id: Number(item.variantId),
        quantity: item.quantity,
      })),
    }),
  })
  if (!response.ok) {
    throw new Error(`Printful order cost estimate failed (${response.status}).`)
  }

  const payload: unknown = await response.json()
  if (!isRecord(payload) || !isRecord(payload.result) || !isRecord(payload.result.costs)) {
    throw new Error('Printful returned an invalid order cost estimate.')
  }

  const costs = payload.result.costs
  const currency = typeof costs.currency === 'string' ? costs.currency.toUpperCase() : ''
  const subtotalCents = toMinorUnits(costs.subtotal, currency)
  const discountCents = toMinorUnits(costs.discount, currency)
  const shippingCents = toMinorUnits(costs.shipping, currency)
  const digitizationCents = toMinorUnits(costs.digitization, currency)
  const taxCents = addMinorUnits(costs.tax, costs.vat, currency)
  const totalCents = toMinorUnits(costs.total, currency)

  if (
    !/^[A-Z]{3}$/.test(currency) ||
    subtotalCents === null ||
    discountCents === null ||
    shippingCents === null ||
    digitizationCents === null ||
    taxCents === null ||
    totalCents === null ||
    discountCents > subtotalCents ||
    items.some((item) => item.currency !== currency)
  ) {
    throw new Error('Printful returned invalid order cost amounts.')
  }

  const otherFeesCents =
    totalCents -
    (subtotalCents - discountCents + shippingCents + digitizationCents + taxCents)
  if (otherFeesCents < 0) {
    throw new Error('Printful returned inconsistent order cost amounts.')
  }

  return {
    currency,
    subtotalCents: subtotalCents - discountCents,
    discountCents,
    shippingCents,
    digitizationCents,
    taxCents,
    otherFeesCents,
    totalCents,
  }
}

export async function getPrintfulItemPrice(
  item: PricedCheckoutItem,
  address: CheckoutAddress,
  token: string,
  storeId?: string,
  shipping = 'STANDARD',
): Promise<number> {
  const estimate = await estimatePrintfulOrderCosts(
    [item],
    address,
    shipping,
    token,
    storeId,
  )
  const priceCents = estimate.subtotalCents + PRINTFUL_MARKUP_CENTS_PER_ITEM * item.quantity
  return Math.round(priceCents / item.quantity)
}

export function getPrintfulCustomerTotals(
  estimate: PrintfulOrderCostEstimate,
  quantity: number,
) {
  const markupCents = PRINTFUL_MARKUP_CENTS_PER_ITEM * quantity
  return {
    currency: estimate.currency,
    subtotalCents: estimate.subtotalCents + markupCents,
    shippingCents: estimate.shippingCents,
    digitizationCents: estimate.digitizationCents,
    taxCents: estimate.taxCents,
    otherFeesCents: estimate.otherFeesCents,
    totalCents: estimate.totalCents + markupCents,
  }
}

export function getOrderTotals(
  items: PricedCheckoutItem[],
  shippingCents: number,
  taxCents: number,
) {
  const currency = items[0]?.currency ?? 'USD'
  const subtotalCents = items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
  return {
    currency,
    subtotalCents,
    taxCents,
    shippingCents,
    totalCents: subtotalCents + taxCents + shippingCents,
  }
}

function addMinorUnits(first: unknown, second: unknown, currency: string): number | null {
  const firstCents = toMinorUnits(first, currency)
  const secondCents = toMinorUnits(second, currency)
  return firstCents === null || secondCents === null ? null : firstCents + secondCents
}

function positiveIntegerString(value: unknown): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const stringValue = String(value)
  return /^\d+$/.test(stringValue) && Number(stringValue) > 0 ? stringValue : null
}

function safeText(value: unknown, maxLength: number): string {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : ''
}

function positiveNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isPrintfulSyncVariant(value: unknown): value is PrintfulSyncVariant {
  return (
    isRecord(value) &&
    typeof value.id === 'number' &&
    Number.isInteger(value.id) &&
    typeof value.variant_id === 'number' &&
    Number.isInteger(value.variant_id) &&
    typeof value.name === 'string' &&
    typeof value.retail_price === 'string' &&
    typeof value.currency === 'string'
  )
}
