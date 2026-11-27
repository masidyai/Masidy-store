'use client'

import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/products/format'
import { fromMinorUnits } from '@/lib/checkout/money'

interface Delivery {
  id: string
  seller_name: string | null
  seller_email: string
  status: string
  tracking_number: string | null
  tracking_url: string | null
  shipped_at: string | null
  created_at: string
  currency: string
  transfer_minor: number
  listing_title: string
}

interface TransferFailure {
  id: string
  payout_type: string
  seller_name: string | null
  seller_email: string
  transfer_minor: number
  currency: string
  transfer_error: string
  delivered_at: string
  transfer_status: string
}

export function MarketplaceDeliveryReview() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [transferFailures, setTransferFailures] = useState<TransferFailure[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const response = await fetch('/api/admin/marketplace-orders')
    const result: unknown = await response.json()
    if (!response.ok || !isRecord(result) || !Array.isArray(result.deliveries) || !Array.isArray(result.transferFailures)) {
      throw new Error(getMessage(result, 'Could not load shipments awaiting verification.'))
    }
    setDeliveries(result.deliveries as Delivery[])
    setTransferFailures(result.transferFailures as TransferFailure[])
  }

  useEffect(() => {
    let active = true
    void load()
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load shipments awaiting verification.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function confirmDelivery(sellerOrderId: string) {
    setBusy(sellerOrderId)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/admin/marketplace-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'confirm_delivery', sellerOrderId }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(getMessage(result, 'Could not verify this delivery.'))
      await load()
      setMessage('Delivery verified. The 30-day seller transfer hold starts now.')
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : 'Could not verify this delivery.')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="mt-10">
      <h2 className="text-xl font-semibold">Delivery verification</h2>
      <p className="mt-1 text-sm text-muted-foreground">Review tracking evidence and confirm delivery only after verification. Seller payouts become eligible 30 days after your confirmation.</p>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm text-green-700">{message}</p>}
      {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading shipments...</p> : deliveries.length === 0 ? (
        <p className="mt-4 rounded-md border border-border p-4 text-sm text-muted-foreground">No shipments are awaiting review.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {deliveries.map((delivery) => (
            <li key={delivery.id} className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">{delivery.listing_title}</p>
                <p className="text-sm text-muted-foreground">{delivery.seller_name || delivery.seller_email} · {delivery.seller_email}</p>
                <p className="mt-1 text-sm">Tracking: {delivery.tracking_number || 'Missing'}</p>
                {delivery.tracking_url && <a href={delivery.tracking_url} target="_blank" rel="noopener noreferrer" className="text-sm text-accent underline">Review carrier tracking</a>}
                <p className="mt-1 text-xs text-muted-foreground">Expected transfer: {formatPrice(fromMinorUnits(delivery.transfer_minor, delivery.currency), delivery.currency)} · shipped {delivery.shipped_at ? new Date(delivery.shipped_at).toLocaleDateString() : 'date unavailable'}</p>
              </div>
              <button type="button" disabled={busy === delivery.id || !delivery.tracking_url || !delivery.tracking_number} onClick={() => void confirmDelivery(delivery.id)} className="min-h-11 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground disabled:opacity-50">
                {busy === delivery.id ? 'Saving...' : 'Confirm delivery'}
              </button>
            </li>
          ))}
        </ul>
      )}
        {transferFailures.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold">Seller transfers needing attention</h3>
            <ul className="mt-3 space-y-3">
              {transferFailures.map((failure) => (
                <li key={failure.id} className="rounded-lg border border-destructive/30 p-4">
                  <p className="font-medium">{failure.payout_type} · {failure.seller_name || failure.seller_email} · {failure.seller_email}</p>
                  <p className="mt-1 text-sm text-destructive">{failure.transfer_error}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPrice(fromMinorUnits(failure.transfer_minor, failure.currency), failure.currency)}
                    {failure.delivered_at ? ` · verified ${new Date(failure.delivered_at).toLocaleDateString()}` : ''}
                    {failure.transfer_status === 'transferred'
                      ? ' · already transferred; manual recovery required'
                      : ' · payout blocked or awaiting retry'}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
    </section>
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.message === 'string' ? value.message : fallback
}
