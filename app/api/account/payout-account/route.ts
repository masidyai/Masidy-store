import { NextResponse } from 'next/server'
import { env } from 'cloudflare:workers'
import { getCurrentUser } from '@/lib/auth/session'
import {
  getMarketplacePayoutAccount,
  saveMarketplacePayoutAccount,
  updateMarketplacePayoutAccountStatus,
} from '@/lib/marketplace/db'
import { isMarketplaceSellerCountry } from '@/lib/marketplace/countries'
import {
  createAccountOnboardingLink,
  createRecipientAccount,
  retrieveConnectedAccount,
  StripeConnectError,
} from '@/lib/stripe/connect'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Please sign in.' }, { status: 401 })
  if (!user.isReseller && !user.isSeller) {
    return NextResponse.json({ message: 'Marketplace access is not active.' }, { status: 403 })
  }

  try {
    const payoutAccount = await getMarketplacePayoutAccount(user.id)
    if (!payoutAccount) return NextResponse.json({ account: null })

    const secretKey = env.STRIPE_SECRET_KEY
    if (!secretKey || !payoutAccount.stripeAccountId) {
      return NextResponse.json({ account: publicAccountState(payoutAccount) })
    }

    const status = await retrieveConnectedAccount(secretKey, payoutAccount.stripeAccountId)
    await updateMarketplacePayoutAccountStatus({
      userId: user.id,
      stripeAccountId: status.id,
      transfersActive: status.transfersActive,
      payoutsEnabled: status.payoutsActive,
    })
    return NextResponse.json({
      account: {
        country: payoutAccount.country,
        transfersActive: status.transfersActive,
        payoutsEnabled: status.payoutsActive,
      },
    })
  } catch (error) {
    console.error('[Marketplace] Could not load payout account status:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Could not load payout account status.' },
      { status: error instanceof StripeConnectError ? error.status : 500 },
    )
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Please sign in.' }, { status: 401 })
  if (!user.isReseller && !user.isSeller) {
    return NextResponse.json({ message: 'Marketplace access is not active.' }, { status: 403 })
  }
  if (!env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ message: 'Stripe Connect is not configured for this environment.' }, { status: 503 })
  }

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  if (!isRecord(body)) return NextResponse.json({ message: 'Invalid payout account request.' }, { status: 400 })

  try {
    let payoutAccount = await getMarketplacePayoutAccount(user.id)
    let accountId = payoutAccount?.stripeAccountId
    if (!accountId) {
      const country = typeof body.country === 'string' ? body.country.toUpperCase() : ''
      const entityType = body.entityType === 'company' ? 'company' : body.entityType === 'individual' ? 'individual' : null
      if (!isMarketplaceSellerCountry(country) || !entityType) {
        return NextResponse.json({ message: 'Select a supported country and account type.' }, { status: 400 })
      }

      const connected = await createRecipientAccount({
        secretKey: env.STRIPE_SECRET_KEY,
        userId: user.id,
        email: user.email,
        displayName: safeDisplayName(body.displayName, user.name || user.email),
        country,
        entityType,
      })
      await saveMarketplacePayoutAccount({
        userId: user.id,
        stripeAccountId: connected.id,
        country,
        transfersActive: connected.transfersActive,
        payoutsEnabled: connected.payoutsActive,
      })
      accountId = connected.id
      payoutAccount = {
        stripeAccountId: connected.id,
        country,
        transfersActive: connected.transfersActive,
        payoutsEnabled: connected.payoutsActive,
      }
    } else if (
      payoutAccount &&
      typeof body.country === 'string' &&
      body.country.trim() &&
      body.country.toUpperCase() !== payoutAccount.country
    ) {
      return NextResponse.json({ message: 'A payout account already exists for a different country.' }, { status: 409 })
    }

    if (!accountId) throw new Error('Stripe connected account was not saved.')
    const publicSiteUrl = env.PUBLIC_SITE_URL
    if (!publicSiteUrl) {
      return NextResponse.json({ message: 'The site URL is not configured.' }, { status: 503 })
    }
    const dashboardPath = user.isSeller ? '/account/seller' : '/account/reseller'
    const dashboardUrl = new URL(dashboardPath, publicSiteUrl)
    const refreshUrl = new URL(`${dashboardPath}?connect=refresh`, publicSiteUrl)
    const returnUrl = new URL(`${dashboardPath}?connect=return`, publicSiteUrl)
    const url = await createAccountOnboardingLink(
      env.STRIPE_SECRET_KEY,
      accountId,
      refreshUrl.toString(),
      returnUrl.toString(),
    )
    return NextResponse.json({ onboardingUrl: url, dashboardUrl: dashboardUrl.toString() })
  } catch (error) {
    console.error('[Marketplace] Could not start payout onboarding:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Could not start payout onboarding.' },
      { status: error instanceof StripeConnectError ? error.status : 500 },
    )
  }
}

function publicAccountState(account: {
  country: string | null
  transfersActive: boolean
  payoutsEnabled: boolean
}) {
  return {
    country: account.country,
    transfersActive: account.transfersActive,
    payoutsEnabled: account.payoutsEnabled,
  }
}

function safeDisplayName(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 120)
    : fallback.slice(0, 120)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
