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

interface RecoveryCase {
  id: string
  marketplace_order_id: string
  payout_type: string
  seller_name: string | null
  seller_email: string
  transfer_minor: number
  currency: string
  stripe_transfer_id: string
  refunded_minor: number
  order_currency: string
  dispute_status: string
  dispute_id: string | null
}

export function MarketplaceDeliveryReview() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [transferFailures, setTransferFailures] = useState<TransferFailure[]>([])
  const [recoveryCases, setRecoveryCases] = useState<RecoveryCase[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function load() {
    const response = await fetch('/api/admin/marketplace-orders')
    const result: unknown = await response.json()
    if (
      !response.ok ||
      !isRecord(result) ||
      !Array.isArray(result.deliveries) ||
      !Array.isArray(result.transferFailures) ||
      !Array.isArray(result.recoveryCases)
    ) {
      throw new Error(getMessage(result, 'Could not load shipments awaiting verification.'))
    }
    setDeliveries(result.deliveries as Delivery[])
    setTransferFailures(result.transferFailures as TransferFailure[])
    setRecoveryCases(result.recoveryCases as RecoveryCase[])
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
        <div className="mt-8">
          <h3 className="font-semibold">Transferred funds requiring review</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            These transfers are associated with a refund or payment dispute. Review the charge and transfer in Stripe and handle recovery manually. The transfer amount is context only; this screen does not move or reverse funds.
          </p>
          {recoveryCases.length === 0 ? (
            <p className="mt-3 rounded-md border border-border p-4 text-sm text-muted-foreground">No transferred funds currently need refund or dispute review.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {recoveryCases.map((recoveryCase) => (
                <li key={recoveryCase.id} className="rounded-lg border border-destructive/30 p-4">
                  <p className="font-medium">{recoveryCase.payout_type} · {recoveryCase.seller_name || recoveryCase.seller_email} · {recoveryCase.seller_email}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Marketplace order <code className="break-all">{recoveryCase.marketplace_order_id}</code>
                    {' · '}Stripe transfer <code className="break-all">{recoveryCase.stripe_transfer_id}</code>
                  </p>
                  <p className="mt-2 text-sm">
                    Transferred amount: {formatPrice(fromMinorUnits(recoveryCase.transfer_minor, recoveryCase.currency), recoveryCase.currency)}
                  </p>
                  {recoveryCase.refunded_minor > 0 && (
                    <p className="mt-1 text-sm text-destructive">
                      Refund recorded: {formatPrice(fromMinorUnits(recoveryCase.refunded_minor, recoveryCase.order_currency), recoveryCase.order_currency)}
                    </p>
                  )}
                  {recoveryCase.dispute_status !== 'none' && (
                    <p className="mt-1 text-sm text-destructive">
                      Dispute {recoveryCase.dispute_status}
                      {recoveryCase.dispute_id && <> · Stripe dispute <code className="break-all">{recoveryCase.dispute_id}</code></>}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        {transferFailures.length > 0 && (
          <div className="mt-8">
            <h3 className="font-semibold">Payouts blocked or awaiting retry</h3>
            <ul className="mt-3 space-y-3">
              {transferFailures.map((failure) => (
                <li key={failure.id} className="rounded-lg border border-destructive/30 p-4">
                  <p className="font-medium">{failure.payout_type} · {failure.seller_name || failure.seller_email} · {failure.seller_email}</p>
                  <p className="mt-1 text-sm text-destructive">{failure.transfer_error}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatPrice(fromMinorUnits(failure.transfer_minor, failure.currency), failure.currency)}
                    {failure.delivered_at ? ` · verified ${new Date(failure.delivered_at).toLocaleDateString()}` : ''}
                    {' · payout not transferred'}
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
