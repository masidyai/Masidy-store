import type { CheckoutAddress } from './printful'

export interface StripeTaxLineItem {
  variantId: string
  quantity: number
  priceCents: number
  taxCode?: string
  taxBehavior?: 'exclusive' | 'inclusive'
}

export interface StripeTaxCalculation {
  id: string
  taxCents: number
  totalCents: number
  currency: string
  taxAmountExclusiveCents: number
  taxAmountInclusiveCents: number
}

export class StripeTaxError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'StripeTaxError'
  }
}

export async function calculateStripeTax(
  secretKey: string,
  items: StripeTaxLineItem[],
  address: CheckoutAddress,
  shippingCents: number,
  currency: string,
  shippingTaxBehavior: 'exclusive' | 'inclusive' = 'exclusive',
): Promise<StripeTaxCalculation> {
  const params = new URLSearchParams()
  params.set('currency', currency.toLowerCase())
  params.set('customer_details[address_source]', 'shipping')
  params.set('customer_details[address][line1]', address.address1)
  params.set('customer_details[address][city]', address.city)
  params.set('customer_details[address][country]', address.country)
  if (address.address2) params.set('customer_details[address][line2]', address.address2)
  if (address.state) params.set('customer_details[address][state]', address.state)
  if (address.zip) params.set('customer_details[address][postal_code]', address.zip)

  items.forEach((item, index) => {
    params.set(`line_items[${index}][amount]`, String(item.priceCents * item.quantity))
    params.set(`line_items[${index}][quantity]`, String(item.quantity))
    params.set(`line_items[${index}][reference]`, `${index}-${item.variantId}`)
    params.set(`line_items[${index}][tax_behavior]`, item.taxBehavior ?? 'exclusive')
    if (item.taxCode) params.set(`line_items[${index}][tax_code]`, item.taxCode)
  })
  if (shippingCents > 0) {
    params.set('shipping_cost[amount]', String(shippingCents))
    params.set('shipping_cost[tax_code]', 'txcd_92010001')
    params.set('shipping_cost[tax_behavior]', shippingTaxBehavior)
  }

  const response = await fetch('https://api.stripe.com/v1/tax/calculations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })
  const payload: unknown = await readResponse(response)
  if (!response.ok) {
    throw new StripeTaxError(getStripeError(payload), response.status)
  }
  if (
    !isRecord(payload) ||
    typeof payload.id !== 'string' ||
    typeof payload.amount_total !== 'number' ||
    !Number.isInteger(payload.amount_total) ||
    typeof payload.tax_amount_exclusive !== 'number' ||
    !Number.isInteger(payload.tax_amount_exclusive) ||
    typeof payload.tax_amount_inclusive !== 'number' ||
    !Number.isInteger(payload.tax_amount_inclusive) ||
    typeof payload.currency !== 'string' ||
    payload.currency.toUpperCase() !== currency.toUpperCase()
  ) {
    throw new StripeTaxError('Stripe returned an invalid tax calculation.', 502)
  }

  const taxCents = payload.tax_amount_exclusive + payload.tax_amount_inclusive
  if (!Number.isSafeInteger(taxCents) || taxCents < 0) {
    throw new StripeTaxError('Stripe returned an invalid tax amount.', 502)
  }

  return {
    id: payload.id,
    taxCents,
    totalCents: payload.amount_total,
    currency: payload.currency.toUpperCase(),
    taxAmountExclusiveCents: payload.tax_amount_exclusive,
    taxAmountInclusiveCents: payload.tax_amount_inclusive,
  }
}

export async function recordStripeTaxTransaction(
  secretKey: string,
  calculationId: string,
  orderId: string,
  paymentIntentId: string,
  idempotencyKey: string = paymentIntentId,
): Promise<void> {
  const params = new URLSearchParams()
  params.set('calculation', calculationId)
  params.set('reference', orderId)

  const response = await fetch('https://api.stripe.com/v1/tax/transactions/create_from_calculation', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Idempotency-Key': `tax-transaction-${idempotencyKey}`,
    },
    body: params.toString(),
  })
  const payload: unknown = await readResponse(response)
  if (!response.ok) {
    throw new StripeTaxError(getStripeError(payload), response.status)
  }
}

async function readResponse(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    throw new StripeTaxError('Stripe returned an invalid response.', 502)
  }
}

function getStripeError(payload: unknown): string {
  return isRecord(payload) && isRecord(payload.error) && typeof payload.error.message === 'string'
    ? payload.error.message
    : 'Stripe Tax could not process this address.'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
