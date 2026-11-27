'use client'

import { useEffect, useState } from 'react'
import { SellerOrdersPanel } from '@/components/marketplace/seller-orders-panel'

interface SellerListing {
  id: string
  title: string
  category: string
  status: 'draft' | 'pending_review' | 'approved' | 'rejected'
  priceMinor: number
  currency: string
  reviewNote: string | null
}

const initialForm = {
  title: '',
  description: '',
  category: '',
  imageUrl: '',
  price: '',
  currency: '',
  shippingZones: '',
}

export function SellerDashboard() {
  const [listings, setListings] = useState<SellerListing[]>([])
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  async function loadListings() {
    const response = await fetch('/api/seller/dashboard')
    const result: unknown = await response.json()
    if (!response.ok || !isListingResponse(result)) {
      throw new Error(getMessage(result, 'Could not load seller dashboard.'))
    }
    setListings(result.listings)
  }

  useEffect(() => {
    let active = true
    void loadListings()
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load seller dashboard.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function saveListing(submit: boolean) {
    setSaving(true)
    setError('')
    setMessage('')
    try {
      const shippingZones = form.shippingZones.trim()
        ? form.shippingZones.split(',').map((zone) => {
          const [country, amount] = zone.trim().split(':')
          return { country, amount }
        })
        : []
      const response = await fetch('/api/seller/listings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, shippingZones, submit }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(getMessage(result, 'Could not save your listing.'))
      await loadListings()
      setForm(initialForm)
      setMessage(submit
        ? 'Listing submitted for review. Approval does not publish or enable checkout.'
        : 'Draft saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your listing.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-8 space-y-8">
      <p className="rounded-md bg-secondary/50 p-4 text-sm text-muted-foreground">
        Approved products can appear in the public marketplace. Checkout remains disabled until Stripe, tax registrations, payout setup, and seller operating requirements are verified.
      </p>

      <section className="rounded-lg border border-border p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Add a product</h2>
        <p className="mt-1 text-sm text-muted-foreground">Shipping zones use country codes and consumer-facing amounts in the selected currency, for example: IT:5.00, DE:8.00. Listed item and shipping prices are treated as tax-inclusive.</p>
        {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="mt-4 text-sm text-green-700">{message}</p>}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Product title" value={form.title} onChange={(title) => setForm({ ...form, title })} required maxLength={150} />
          <Field label="Category" value={form.category} onChange={(category) => setForm({ ...form, category })} required maxLength={60} />
          <Field label="Image URL (HTTPS)" value={form.imageUrl} onChange={(imageUrl) => setForm({ ...form, imageUrl })} required type="url" />
          <Field label="Price" value={form.price} onChange={(price) => setForm({ ...form, price })} required type="number" min="0.01" step="0.01" />
          <label className="block text-sm font-medium">
            Currency
            <select
              required
              value={form.currency}
              onChange={(event) => setForm({ ...form, currency: event.target.value })}
              className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3"
            >
              <option value="">Select currency</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
              <option value="GBP">GBP</option>
            </select>
          </label>
          <Field label="Shipping by country" value={form.shippingZones} onChange={(shippingZones) => setForm({ ...form, shippingZones })} placeholder="IT:5.00, DE:8.00" />
          <label className="block text-sm font-medium sm:col-span-2">
            Description
            <textarea
              required
              maxLength={3000}
              rows={5}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              className="mt-1 w-full rounded-md border border-border bg-background p-3"
            />
          </label>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" disabled={saving} onClick={() => void saveListing(false)} className="min-h-11 rounded-md border border-border px-4 font-semibold disabled:opacity-50">
            {saving ? 'Saving...' : 'Save draft'}
          </button>
          <button type="button" disabled={saving} onClick={() => void saveListing(true)} className="min-h-11 rounded-md bg-accent px-4 font-semibold text-accent-foreground disabled:opacity-50">
            {saving ? 'Submitting...' : 'Submit for review'}
          </button>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Your listings</h2>
        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading listings...</p>
        ) : listings.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">You have not created any listings.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {listings.map((listing) => (
              <li key={listing.id} className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{listing.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {listing.category} · {(listing.priceMinor / 100).toFixed(2)} {listing.currency}
                  </p>
                  {listing.reviewNote && <p className="mt-1 text-sm">Review note: {listing.reviewNote}</p>}
                </div>
                <ListingStatus status={listing.status} />
              </li>
            ))}
          </ul>
        )}
      </section>
      <SellerOrdersPanel />
    </div>
  )
}

function Field({
  label, value, onChange, required, maxLength, type = 'text', min, step, placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
  maxLength?: number
  type?: string
  min?: string
  step?: string
  placeholder?: string
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type={type}
        required={required}
        maxLength={maxLength}
        min={min}
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3"
      />
    </label>
  )
}

function ListingStatus({ status }: { status: SellerListing['status'] }) {
  const labels = {
    draft: 'Draft',
    pending_review: 'Under review',
    approved: 'Approved — not published',
    rejected: 'Changes requested',
  }
  return <span className="w-fit rounded-full bg-secondary px-3 py-1 text-xs font-medium">{labels[status]}</span>
}

function isListingResponse(value: unknown): value is { listings: SellerListing[] } {
  return typeof value === 'object' && value !== null && 'listings' in value && Array.isArray(value.listings)
}

function getMessage(value: unknown, fallback: string): string {
  return typeof value === 'object' && value !== null &&
    'message' in value && typeof value.message === 'string' ? value.message : fallback
}
