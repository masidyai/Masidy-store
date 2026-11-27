'use client'

import { useEffect, useState } from 'react'
import { MarketplaceDeliveryReview } from '@/components/admin/marketplace-delivery-review'

interface Application {
  id: string
  email: string
  name: string | null
  role: 'reseller' | 'seller'
  status: 'pending' | 'approved' | 'rejected'
  policy_version: string
  policy_accepted_at: string
  review_note: string | null
  created_at: string
}

interface Listing {
  id: string
  email: string
  seller_user_id: string
  title: string
  description: string
  category: string
  image_url: string
  price_minor: number
  currency: string
  shipping_zones: string
  tax_code: string | null
  status: 'draft' | 'pending_review' | 'approved' | 'rejected'
  created_at: string
}

interface ReviewQueue {
  applications: Application[]
  listings: Listing[]
  commissionSettings: {
    resellerRatePercent: number | null
    sellerRatePercent: number | null
  }
}

export function MarketplaceReviewDashboard() {
  const [queue, setQueue] = useState<ReviewQueue>({
    applications: [],
    listings: [],
    commissionSettings: { resellerRatePercent: null, sellerRatePercent: null },
  })
  const [rates, setRates] = useState({ reseller: '', seller: '' })
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [taxCodes, setTaxCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadQueue() {
    const response = await fetch('/api/admin/marketplace')
    const result: unknown = await response.json()
    if (!response.ok || !isQueue(result)) throw new Error(getMessage(result, 'Could not load review queue.'))
    setQueue(result)
    setRates({
      reseller: result.commissionSettings.resellerRatePercent === null ? '' : String(result.commissionSettings.resellerRatePercent),
      seller: result.commissionSettings.sellerRatePercent === null ? '' : String(result.commissionSettings.sellerRatePercent),
    })
    setTaxCodes((current) => Object.fromEntries(
      result.listings.map((listing) => [listing.id, current[listing.id] || listing.tax_code || 'txcd_99999999']),
    ))
  }

  async function saveRates(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy('settings')
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'settings',
          resellerRatePercent: Number(rates.reseller),
          sellerRatePercent: Number(rates.seller),
        }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(getMessage(result, 'Could not save commission settings.'))
      setMessage('Commission rates saved. This does not enable earnings or payouts.')
      await loadQueue()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save commission settings.')
    } finally {
      setBusy('')
    }
  }

  useEffect(() => {
    let active = true
    void loadQueue()
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load review queue.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function review(action: 'application' | 'listing', id: string, status: 'approved' | 'rejected') {
    const key = `${action}:${id}`
    setBusy(key)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/marketplace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          id,
          status,
          note: notes[key] ?? '',
          taxCode: taxCodes[id] ?? '',
        }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(getMessage(result, 'Could not save your decision.'))
      await loadQueue()
      setMessage('Review decision saved.')
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not save your decision.')
    } finally {
      setBusy('')
    }

  }

  return (
    <div className="mt-8 space-y-10">
      {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="text-sm text-green-700">{message}</p>}
      {loading ? <p className="text-sm text-muted-foreground">Loading review queue...</p> : (
        <>
          <section className="rounded-lg border border-border p-4 sm:p-5">
            <h2 className="text-xl font-semibold">Commission rates</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Rates apply to the seller&apos;s listed item prices; shipping is excluded. Configure planned rates before launch. This setting does not activate checkout or payouts.
            </p>
            <form onSubmit={(event) => void saveRates(event)} className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <label className="block text-sm font-medium">
                Reseller rate (%)
                <input required type="number" min="0" max="99.99" step="0.01" value={rates.reseller} onChange={(event) => setRates({ ...rates, reseller: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3" />
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  Share of net transaction contribution after tax, fulfillment/shipping costs, and Stripe fees.
                </span>
              </label>
              <label className="block text-sm font-medium">
                Seller rate (%)
                <input required type="number" min="0" max="99.99" step="0.01" value={rates.seller} onChange={(event) => setRates({ ...rates, seller: event.target.value })} className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3" />
              </label>
              <button type="submit" disabled={busy !== ''} className="min-h-11 rounded-md bg-accent px-4 font-semibold text-accent-foreground disabled:opacity-50">
                Save rates
              </button>
            </form>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Program applications</h2>
            {queue.applications.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No applications.</p> : (
              <ul className="mt-4 space-y-4">
                {queue.applications.map((application) => {
                  const key = `application:${application.id}`
                  return (
                    <li key={application.id} className="rounded-lg border border-border p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{application.role === 'seller' ? 'Seller' : 'Reseller'} · {application.name || application.email}</h3>
                          <p className="text-sm text-muted-foreground">{application.email} · {application.status} · policy {application.policy_version}</p>
                        </div>
                        <time className="text-xs text-muted-foreground">{new Date(application.created_at).toLocaleDateString()}</time>
                      </div>
                      {application.review_note && <p className="mt-3 text-sm">Previous note: {application.review_note}</p>}
                      {application.status === 'pending' && (
                        <ReviewActions
                          note={notes[key] ?? ''}
                          onNote={(note) => setNotes((current) => ({ ...current, [key]: note }))}
                          busy={busy === key}
                          onApprove={() => void review('application', application.id, 'approved')}
                          onReject={() => void review('application', application.id, 'rejected')}
                        />
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          <section>
            <h2 className="text-xl font-semibold">Seller listings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Approved listings are visible in the marketplace. Checkout remains disabled until payments and seller operations are verified.</p>
            {queue.listings.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No submitted listings.</p> : (
              <ul className="mt-4 space-y-4">
                {queue.listings.map((listing) => {
                  const key = `listing:${listing.id}`
                  return (
                    <li key={listing.id} className="rounded-lg border border-border p-4 sm:p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-semibold">{listing.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {listing.category} · {(listing.price_minor / 100).toFixed(2)} {listing.currency} · {listing.email} · {listing.status}
                          </p>
                          <p className="mt-2 max-w-3xl whitespace-pre-wrap text-sm">{listing.description}</p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Shipping: {formatShippingZones(listing.shipping_zones, listing.currency)}
                          </p>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Tax category: {listing.tax_code || 'Not assigned'}
                          </p>
                          <a href={listing.image_url} target="_blank" rel="noreferrer" className="mt-1 inline-block text-sm underline">
                            View product image
                          </a>
                        </div>
                        <time className="text-xs text-muted-foreground">{new Date(listing.created_at).toLocaleDateString()}</time>
                      </div>
                      {listing.status === 'pending_review' && (
                        <>
                          <label className="mt-4 block max-w-lg text-sm font-medium">
                            Stripe Tax category
                            <select
                              value={taxCodes[listing.id] ?? 'txcd_99999999'}
                              onChange={(event) => setTaxCodes((current) => ({ ...current, [listing.id]: event.target.value }))}
                              className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3"
                            >
                              <option value="txcd_99999999">General tangible goods</option>
                              <option value="txcd_30011000">Clothing and footwear</option>
                            </select>
                          </label>
                          <ReviewActions
                            note={notes[key] ?? ''}
                            onNote={(note) => setNotes((current) => ({ ...current, [key]: note }))}
                            busy={busy === key}
                            onApprove={() => void review('listing', listing.id, 'approved')}
                            onReject={() => void review('listing', listing.id, 'rejected')}
                          />
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
          <MarketplaceDeliveryReview />
        </>
      )}
    </div>
  )
}

function ReviewActions({
  note,
  onNote,
  busy,
  onApprove,
  onReject,
}: {
  note: string
  onNote: (value: string) => void
  busy: boolean
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <div className="mt-4 space-y-3">
      <label className="block text-sm font-medium">
        Review note (optional)
        <textarea
          value={note}
          maxLength={500}
          rows={2}
          onChange={(event) => onNote(event.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background p-3"
        />
      </label>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={onApprove} className="min-h-10 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-50">
          Approve
        </button>
        <button type="button" disabled={busy} onClick={onReject} className="min-h-10 rounded-md border border-border px-4 text-sm font-semibold disabled:opacity-50">
          Request changes
        </button>
      </div>
    </div>
  )
}

function isQueue(value: unknown): value is ReviewQueue {
  return typeof value === 'object' && value !== null &&
    'applications' in value && Array.isArray(value.applications) &&
    'listings' in value && Array.isArray(value.listings) &&
    'commissionSettings' in value && typeof value.commissionSettings === 'object' &&
    value.commissionSettings !== null &&
    'resellerRatePercent' in value.commissionSettings &&
    'sellerRatePercent' in value.commissionSettings
}

function formatShippingZones(value: string, currency: string): string {
  try {
    const zones: unknown = JSON.parse(value)
    if (!Array.isArray(zones)) return 'Invalid zone data'
    return zones.map((zone) => {
      if (typeof zone !== 'object' || zone === null || !('country' in zone) || !('amountMinor' in zone)) return 'Invalid zone'
      return `${String(zone.country)}: ${(Number(zone.amountMinor) / 100).toFixed(2)} ${currency}`
    }).join(', ') || 'No zones'
  } catch {
    return 'Invalid zone data'
  }
}

function getMessage(value: unknown, fallback: string): string {
  return typeof value === 'object' && value !== null &&
    'message' in value && typeof value.message === 'string' ? value.message : fallback
}
