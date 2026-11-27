const STRIPE_V2_API = 'https://api.stripe.com/v2'
const STRIPE_V2_VERSION = '2026-11-18.preview'

export class StripeConnectError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'StripeConnectError'
  }
}

export interface StripeConnectedAccountStatus {
  id: string
  transfersActive: boolean
  payoutsActive: boolean
}

export async function createRecipientAccount(input: {
  secretKey: string
  userId: string
  email: string
  displayName: string
  country: string
  entityType: 'individual' | 'company'
}): Promise<StripeConnectedAccountStatus> {
  const account = await stripeRequest(input.secretKey, '/core/accounts', {
    method: 'POST',
    idempotencyKey: `masidy-marketplace-recipient-${input.userId}`,
    body: {
      contact_email: input.email,
      display_name: input.displayName,
      identity: {
        country: input.country.toLowerCase(),
        entity_type: input.entityType,
      },
      dashboard: 'express',
      defaults: {
        responsibilities: {
          fees_collector: 'application',
          losses_collector: 'application',
        },
      },
      configuration: {
        recipient: {
          capabilities: {
            stripe_balance: {
              stripe_transfers: { requested: true },
            },
          },
        },
      },
      include: ['configuration.recipient', 'identity', 'requirements', 'defaults'],
    },
  })

  const status = parseAccountStatus(account)
  if (!status) throw new StripeConnectError('Stripe returned an invalid connected account.', 502)
  return status
}

export async function createAccountOnboardingLink(
  secretKey: string,
  accountId: string,
  refreshUrl: string,
  returnUrl: string,
): Promise<string> {
  const link = await stripeRequest(secretKey, '/core/account_links', {
    method: 'POST',
    body: {
      account: accountId,
      use_case: {
        type: 'account_onboarding',
        account_onboarding: {
          refresh_url: refreshUrl,
          return_url: returnUrl,
          collection_options: { fields: 'currently_due' },
        },
      },
    },
  })

  if (!isRecord(link) || typeof link.url !== 'string' || !isStripeUrl(link.url)) {
    throw new StripeConnectError('Stripe returned an invalid onboarding link.', 502)
  }
  return link.url
}

export async function retrieveConnectedAccount(
  secretKey: string,
  accountId: string,
): Promise<StripeConnectedAccountStatus> {
  const query = new URLSearchParams()
  query.append('include[]', 'configuration.recipient')
  query.append('include[]', 'requirements')
  query.append('include[]', 'identity')
  const account = await stripeRequest(
    secretKey,
    `/core/accounts/${encodeURIComponent(accountId)}?${query.toString()}`,
    { method: 'GET' },
  )

  const status = parseAccountStatus(account)
  if (!status) throw new StripeConnectError('Stripe returned an invalid connected account status.', 502)
  return status
}

async function stripeRequest(
  secretKey: string,
  path: string,
  options: {
    method: 'GET' | 'POST'
    body?: Record<string, unknown>
    idempotencyKey?: string
  },
): Promise<unknown> {
  let response: Response
  try {
    response = await fetch(`${STRIPE_V2_API}${path}`, {
      method: options.method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Stripe-Version': STRIPE_V2_VERSION,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    })
  } catch {
    throw new StripeConnectError('Could not reach Stripe Connect.', 502)
  }

  let payload: unknown
  try {
    payload = await response.json()
  } catch {
    throw new StripeConnectError('Stripe Connect returned an invalid response.', 502)
  }

  if (!response.ok) {
    const message = isRecord(payload) && isRecord(payload.error) &&
      typeof payload.error.message === 'string'
      ? payload.error.message
      : 'Stripe Connect could not complete the request.'
    throw new StripeConnectError(message, response.status)
  }
  return payload
}

function parseAccountStatus(value: unknown): StripeConnectedAccountStatus | null {
  if (!isRecord(value) || typeof value.id !== 'string' || !value.id.startsWith('acct_')) return null
  const config = isRecord(value.configuration) ? value.configuration : null
  const recipient = config && isRecord(config.recipient) ? config.recipient : null
  const capabilities = recipient && isRecord(recipient.capabilities) ? recipient.capabilities : null
  const stripeBalance = capabilities && isRecord(capabilities.stripe_balance) ? capabilities.stripe_balance : null
  const transfers = stripeBalance && isRecord(stripeBalance.stripe_transfers) ? stripeBalance.stripe_transfers : null
  const payouts = stripeBalance && isRecord(stripeBalance.payouts) ? stripeBalance.payouts : null

  return {
    id: value.id,
    transfersActive: transfers?.status === 'active',
    payoutsActive: payouts?.status === 'active',
  }
}

function isStripeUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.hostname === 'connect.stripe.com'
  } catch {
    return false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
