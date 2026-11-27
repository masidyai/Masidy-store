'use client'

import { useEffect, useState } from 'react'
import { MARKETPLACE_SELLER_COUNTRIES } from '@/lib/marketplace/countries'

interface PayoutAccount {
  country: string | null
  transfersActive: boolean
  payoutsEnabled: boolean
}

export function PayoutAccountSetup() {
  const [account, setAccount] = useState<PayoutAccount | null>(null)
  const [country, setCountry] = useState('')
  const [entityType, setEntityType] = useState<'individual' | 'company'>('individual')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    async function load() {
      try {
        const response = await fetch('/api/account/payout-account')
        const result: unknown = await response.json()
        if (!response.ok) throw new Error(getMessage(result, 'Could not check payout setup.'))
        if (!isAccountResponse(result)) throw new Error('Invalid payout account status.')
        if (active) {
          setAccount(result.account)
          setCountry(result.account?.country || '')
        }
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not check payout setup.')
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [])

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('connect') === 'refresh') {
      void startOnboarding()
    }
  }, [])

  async function startOnboarding() {
    setBusy(true)
    setError('')
    try {
      const response = await fetch('/api/account/payout-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country, entityType, displayName }),
      })
      const result: unknown = await response.json()
      if (!response.ok || !isRecord(result) || typeof result.onboardingUrl !== 'string') {
        throw new Error(getMessage(result, 'Could not start Stripe onboarding.'))
      }
      window.location.assign(result.onboardingUrl)
    } catch (onboardingError) {
      setError(onboardingError instanceof Error ? onboardingError.message : 'Could not start Stripe onboarding.')
      setBusy(false)
    }
  }

  return (
    <section className="rounded-lg border border-border p-5 sm:p-6">
      <h2 className="text-lg font-semibold">Payout setup</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Complete secure identity and bank verification before you can receive seller payouts or reseller commissions.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {loading ? <p className="mt-4 text-sm text-muted-foreground">Checking your payout account...</p> : account ? (
        <div className="mt-4">
          <p className="text-sm">
            {account.transfersActive && account.payoutsEnabled
              ? 'Payout account verified and ready.'
              : 'Stripe still requires information or verification for your payout account.'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Seller region: {account.country}</p>
          <button
            type="button"
            disabled={busy || (account.transfersActive && account.payoutsEnabled)}
            onClick={() => void startOnboarding()}
            className="mt-4 min-h-11 rounded-md border border-border px-4 text-sm font-semibold disabled:opacity-50"
          >
            {busy ? 'Opening secure setup...' : account.transfersActive && account.payoutsEnabled ? 'Payouts ready' : 'Continue secure setup'}
          </button>
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Country
            <select
              value={country}
              onChange={(event) => setCountry(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3"
            >
              <option value="">Select your country</option>
              {MARKETPLACE_SELLER_COUNTRIES.map((code) => (
                <option key={code} value={code}>{countryName(code)} ({code})</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            Account type
            <select
              value={entityType}
              onChange={(event) => setEntityType(event.target.value as 'individual' | 'company')}
              className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3"
            >
              <option value="individual">Individual</option>
              <option value="company">Company</option>
            </select>
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            Display name (optional)
            <input
              value={displayName}
              maxLength={120}
              onChange={(event) => setDisplayName(event.target.value)}
              className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3"
            />
          </label>
          <button
            type="button"
            disabled={busy || !country}
            onClick={() => void startOnboarding()}
            className="min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-50 sm:col-span-2 sm:justify-self-start"
          >
            {busy ? 'Opening secure setup...' : 'Set up payouts'}
          </button>
        </div>
      )}
      <p className="mt-4 text-xs text-muted-foreground">
        Current payout onboarding is limited to eligible countries in the EEA, UK, and Switzerland. Middle East payouts are not enabled.
      </p>
    </section>
  )
}

function countryName(code: string): string {
  return new Intl.DisplayNames(['en'], { type: 'region' }).of(code) || code
}

function isAccountResponse(value: unknown): value is { account: PayoutAccount | null } {
  return isRecord(value) && 'account' in value &&
    (value.account === null || (
      isRecord(value.account) &&
      (typeof value.account.country === 'string' || value.account.country === null) &&
      typeof value.account.transfersActive === 'boolean' &&
      typeof value.account.payoutsEnabled === 'boolean'
    ))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.message === 'string' ? value.message : fallback
}
