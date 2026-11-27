export class MarketplacePaymentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'MarketplacePaymentError'
  }
}

export interface MarketplacePaymentIntent {
  id: string
  clientSecret: string
}

export interface MarketplaceTransfer {
  id: string
}

export interface StripePaymentFinancials {
  chargeId: string
  feeMinor: number
  feeCurrency: string
}

export async function createMarketplacePaymentIntent(input: {
  secretKey: string
  orderId: string
  transferGroup: string
  checkoutKey: string
  taxCalculationId: string
  email: string
  amountMinor: number
  currency: string
}): Promise<MarketplacePaymentIntent> {
  const params = new URLSearchParams()
  params.set('amount', String(input.amountMinor))
  params.set('currency', input.currency.toLowerCase())
  params.set('receipt_email', input.email)
  params.set('description', 'Masidy Marketplace order')
  params.set('automatic_payment_methods[enabled]', 'true')
  params.set('transfer_group', input.transferGroup)
  params.set('metadata[order_id]', input.orderId)
  params.set('metadata[checkout_flow]', 'marketplace')
  params.set('metadata[tax_calculation_id]', input.taxCalculationId)

  let response: Response
  try {
    response = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `marketplace-payment-${input.checkoutKey}`,
      },
      body: params.toString(),
    })
  } catch {
    throw new MarketplacePaymentError('Could not reach the payment service. Please try again.', 502)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new MarketplacePaymentError('The payment service returned an invalid response.', 502)
  }

  if (!response.ok) {
    const message = isRecord(payload) && isRecord(payload.error) &&
      typeof payload.error.message === 'string'
      ? payload.error.message
      : 'The payment service could not create the payment.'
    throw new MarketplacePaymentError(message, response.status)
  }
  if (
    !isRecord(payload) ||
    typeof payload.id !== 'string' ||
    typeof payload.client_secret !== 'string' ||
    payload.amount !== input.amountMinor ||
    payload.currency !== input.currency.toLowerCase()
  ) {
    throw new MarketplacePaymentError('The payment service returned an invalid payment.', 502)
  }

  return { id: payload.id, clientSecret: payload.client_secret }
}

export async function createMarketplaceTransfer(input: {
  secretKey: string
  referenceId: string
  destinationAccountId: string
  sourceTransactionId: string
  transferGroup: string
  amountMinor: number
  currency: string
}): Promise<MarketplaceTransfer> {
  const params = new URLSearchParams()
  params.set('amount', String(input.amountMinor))
  params.set('currency', input.currency.toLowerCase())
  params.set('destination', input.destinationAccountId)
  params.set('source_transaction', input.sourceTransactionId)
  params.set('transfer_group', input.transferGroup)
  params.set('metadata[masidy_transfer_reference]', input.referenceId)

  let response: Response
  try {
    response = await fetch('https://api.stripe.com/v1/transfers', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Idempotency-Key': `masidy-transfer-${input.referenceId}`,
      },
      body: params.toString(),
    })
  } catch {
    throw new MarketplacePaymentError('Could not reach Stripe to release the transfer.', 502)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new MarketplacePaymentError('Stripe returned an invalid transfer response.', 502)
  }
  if (!response.ok) {
    const message = isRecord(payload) && isRecord(payload.error) &&
      typeof payload.error.message === 'string'
      ? payload.error.message
      : 'Stripe could not release the transfer.'
    throw new MarketplacePaymentError(message, response.status)
  }
  if (
    !isRecord(payload) ||
    typeof payload.id !== 'string' ||
    payload.amount !== input.amountMinor ||
    payload.currency !== input.currency.toLowerCase() ||
    payload.destination !== input.destinationAccountId ||
    payload.transfer_group !== input.transferGroup
  ) {
    throw new MarketplacePaymentError('Stripe returned an invalid transfer.', 502)
  }
  return { id: payload.id }
}

export async function retrieveStripePaymentFinancials(
  secretKey: string,
  paymentIntentId: string,
): Promise<StripePaymentFinancials> {
  const query = new URLSearchParams()
  query.append('expand[]', 'latest_charge.balance_transaction')
  const paymentIntent = await stripeGet(
    secretKey,
    `/v1/payment_intents/${encodeURIComponent(paymentIntentId)}?${query.toString()}`,
  )
  if (!isRecord(paymentIntent)) {
    throw new MarketplacePaymentError('Stripe returned invalid payment details.', 502)
  }

  const latestCharge = paymentIntent.latest_charge
  const charge = isRecord(latestCharge)
    ? latestCharge
    : typeof latestCharge === 'string'
      ? await getCharge(secretKey, latestCharge)
      : null
  if (!charge || typeof charge.id !== 'string' || !charge.id.startsWith('ch_')) {
    throw new MarketplacePaymentError('Stripe has not provided the completed charge yet.', 409)
  }

  let balanceTransaction = charge.balance_transaction
  if (typeof balanceTransaction === 'string') {
    balanceTransaction = await stripeGet(
      secretKey,
      `/v1/balance_transactions/${encodeURIComponent(balanceTransaction)}`,
    )
  }
  if (
    !isRecord(balanceTransaction) ||
    !Number.isSafeInteger(balanceTransaction.fee) ||
    Number(balanceTransaction.fee) < 0 ||
    typeof balanceTransaction.currency !== 'string' ||
    !/^[a-z]{3}$/i.test(balanceTransaction.currency)
  ) {
    throw new MarketplacePaymentError('Stripe has not provided the final processing fee yet.', 409)
  }

  return {
    chargeId: charge.id,
    feeMinor: Number(balanceTransaction.fee),
    feeCurrency: balanceTransaction.currency.toUpperCase(),
  }
}

async function getCharge(secretKey: string, chargeId: string): Promise<Record<string, unknown> | null> {
  const query = new URLSearchParams()
  query.append('expand[]', 'balance_transaction')
  const charge = await stripeGet(
    secretKey,
    `/v1/charges/${encodeURIComponent(chargeId)}?${query.toString()}`,
  )
  return isRecord(charge) ? charge : null
}

async function stripeGet(secretKey: string, path: string): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`https://api.stripe.com${path}`, {
      headers: { Authorization: `Bearer ${secretKey}` },
    })
  } catch {
    throw new MarketplacePaymentError('Could not retrieve completed payment details from Stripe.', 502)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new MarketplacePaymentError('Stripe returned invalid payment details.', 502)
  }
  if (!response.ok) {
    const message = isRecord(payload) && isRecord(payload.error) &&
      typeof payload.error.message === 'string'
      ? payload.error.message
      : 'Could not retrieve completed payment details from Stripe.'
    throw new MarketplacePaymentError(message, response.status)
  }
  return payload
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
