'use client'

import { useEffect, useState } from 'react'
import { fromMinorUnits } from '@/lib/checkout/money'
import { formatPrice } from '@/lib/products/format'

interface ResellerData {
  referralCode: string
  totalClicks: number
  recentClicks: number
  marketplaceEarnings: Array<{
    currency: string
    pending_minor: number
    paid_minor: number
    attributed_orders: number
  }>
}

export function ResellerDashboard() {
  const [data, setData] = useState<ResellerData | null>(null)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [destination, setDestination] = useState('/search')

  useEffect(() => {
    let active = true
    void fetch('/api/reseller/dashboard')
      .then(async (response) => {
        const result: unknown = await response.json()
        if (!response.ok || !isResellerData(result)) {
          throw new Error(getMessage(result, 'Could not load reseller dashboard.'))
        }
        if (active) setData(result)
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load reseller dashboard.')
      })
    return () => { active = false }
  }, [])

  const referralUrl = data && typeof window !== 'undefined'
    ? `${window.location.origin}/r/${data.referralCode}?to=${encodeURIComponent(destination)}`
    : ''

  async function copyLink() {
    if (!referralUrl) return
    try {
      await navigator.clipboard.writeText(referralUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Could not copy the link. You can select and copy it manually.')
    }
  }

  return (
    <section className="mt-8 space-y-6">
      {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
      {!data && !error ? <p className="text-sm text-muted-foreground">Loading your referral data...</p> : null}
      {data && (
        <>
          <div className="rounded-lg border border-border p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Your referral link</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Share a product or marketplace page. A valid referral is attributed for 30 days after the last click.
            </p>
            <label className="mt-4 block text-sm font-medium">
              Page to share
              <input
                value={destination}
                onChange={(event) => setDestination(event.target.value)}
                placeholder="/search or /marketplace"
                className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3"
              />
            </label>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                readOnly
                aria-label="Your referral link"
                value={referralUrl}
                onFocus={(event) => event.currentTarget.select()}
                className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-background px-3 text-sm"
              />
              <button type="button" onClick={() => void copyLink()} className="min-h-11 rounded-md bg-accent px-4 font-semibold text-accent-foreground">
                {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <MetricCard label="All-time referral visits" value={data.totalClicks} />
            <MetricCard label="Visits in the last 30 days" value={data.recentClicks} />
          </div>
          <div className="rounded-lg border border-border p-5 sm:p-6">
            <h2 className="text-lg font-semibold">Marketplace earnings</h2>
            {data.marketplaceEarnings.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">No eligible marketplace orders have been attributed yet.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {data.marketplaceEarnings.map((earning) => (
                  <li key={earning.currency} className="grid gap-2 text-sm sm:grid-cols-3">
                    <span>{earning.attributed_orders} attributed {earning.attributed_orders === 1 ? 'order' : 'orders'}</span>
                    <span>Pending: {formatPrice(fromMinorUnits(earning.pending_minor, earning.currency), earning.currency)}</span>
                    <span>Paid: {formatPrice(fromMinorUnits(earning.paid_minor, earning.currency), earning.currency)}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              Earnings are based on net transaction contribution and become payable only after delivery verification and the 30-day hold.
            </p>
          </div>
          <p className="rounded-md bg-secondary/50 p-4 text-sm text-muted-foreground">
            Marketplace referrals are attributed to eligible orders. Masidy product referrals remain unavailable until actual fulfillment costs and delivery are verified.
          </p>
        </>
      )}
    </section>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  )
}

function isResellerData(value: unknown): value is ResellerData {
  return typeof value === 'object' && value !== null &&
    'referralCode' in value && typeof value.referralCode === 'string' &&
    'totalClicks' in value && typeof value.totalClicks === 'number' &&
    'recentClicks' in value && typeof value.recentClicks === 'number' &&
    'marketplaceEarnings' in value && Array.isArray(value.marketplaceEarnings)
}

function getMessage(value: unknown, fallback: string): string {
  return typeof value === 'object' && value !== null &&
    'message' in value && typeof value.message === 'string' ? value.message : fallback
}
