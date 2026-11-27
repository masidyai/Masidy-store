'use client'

import { useEffect, useState } from 'react'
import { formatPrice } from '@/lib/products/format'
import { fromMinorUnits } from '@/lib/checkout/money'

interface SellerOrder {
  id: string
  status: string
  subtotalMinor: number
  shippingMinor: number
  commissionMinor: number
  transferMinor: number
  currency: string
  trackingNumber: string | null
  trackingUrl: string | null
  deliveredAt: string | null
  transferStatus: string
  transferError: string | null
  shippingAddress: {
    name?: string
    address1?: string
    address2?: string
    city?: string
    state?: string
    zip?: string
    country?: string
    phone?: string
  }
  email: string
  createdAt: string
  items: Array<{ listingId: string; title: string; quantity: number }>
}

export function SellerOrdersPanel() {
  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [tracking, setTracking] = useState<Record<string, { number: string; url: string }>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function loadOrders() {
    const response = await fetch('/api/seller/orders')
    const result: unknown = await response.json()
    if (!response.ok || !isRecord(result) || !Array.isArray(result.orders)) {
      throw new Error(getMessage(result, 'Could not load seller orders.'))
    }
    setOrders(result.orders as SellerOrder[])
  }

  useEffect(() => {
    let active = true
    void loadOrders()
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load seller orders.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  async function submitTracking(orderId: string) {
    const details = tracking[orderId]
    if (!details) return
    setBusy(orderId)
    setError('')
    setMessage('')
    try {
      const response = await fetch('/api/seller/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, trackingNumber: details.number, trackingUrl: details.url }),
      })
      const result: unknown = await response.json()
      if (!response.ok) throw new Error(getMessage(result, 'Could not save tracking details.'))
      await loadOrders()
      setMessage('Tracking details submitted for delivery verification.')
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Could not save tracking details.')
    } finally {
      setBusy('')
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">Customer orders</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Submit valid shipment tracking. Masidy reviews delivery proof, then holds seller funds for 30 days before they become eligible for transfer.
      </p>
      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      {message && <p role="status" className="mt-3 text-sm text-green-700">{message}</p>}
      {loading ? <p className="mt-4 text-sm text-muted-foreground">Loading orders...</p> : orders.length === 0 ? (
        <p className="mt-4 rounded-md border border-border p-4 text-sm text-muted-foreground">No marketplace orders yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {orders.map((order) => {
            const currentTracking = tracking[order.id] ?? {
              number: order.trackingNumber ?? '',
              url: order.trackingUrl ?? '',
            }
            return (
              <li key={order.id} className="rounded-lg border border-border p-4 sm:p-5">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{order.items.map((item) => `${item.title} × ${item.quantity}`).join(', ')}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Order {order.id.slice(0, 12).toUpperCase()} · {new Date(order.createdAt).toLocaleDateString()}</p>
                    <p className="mt-1 text-sm">Status: {humanize(order.status)}</p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="font-semibold">Your expected transfer: {formatPrice(fromMinorUnits(order.transferMinor, order.currency), order.currency)}</p>
                    <p className="text-muted-foreground">After 30-day hold and subject to refunds or disputes</p>
                  </div>
                </div>
                <div className="mt-4 rounded-md bg-secondary/30 p-3 text-sm">
                  <p className="font-medium">Deliver to</p>
                  <p>{order.shippingAddress.name} · {order.email}</p>
                  <p>{order.shippingAddress.address1}{order.shippingAddress.address2 ? `, ${order.shippingAddress.address2}` : ''}</p>
                  <p>{[order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.zip, order.shippingAddress.country].filter(Boolean).join(', ')}</p>
                  {order.shippingAddress.phone && <p>{order.shippingAddress.phone}</p>}
                </div>
                {order.deliveredAt ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    Delivery verified {new Date(order.deliveredAt).toLocaleDateString()}. Transfer status: {humanize(order.transferStatus)}.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_2fr_auto] sm:items-end">
                    <label className="block text-sm font-medium">
                      Tracking number
                      <input value={currentTracking.number} onChange={(event) => setTracking((current) => ({ ...current, [order.id]: { ...currentTracking, number: event.target.value } }))} className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3" />
                    </label>
                    <label className="block text-sm font-medium">
                      Tracking link (HTTPS)
                      <input type="url" value={currentTracking.url} onChange={(event) => setTracking((current) => ({ ...current, [order.id]: { ...currentTracking, url: event.target.value } }))} className="mt-1 min-h-11 w-full rounded-md border border-border bg-background px-3" />
                    </label>
                    <button type="button" disabled={busy === order.id} onClick={() => void submitTracking(order.id)} className="min-h-11 rounded-md bg-accent px-4 font-semibold text-accent-foreground disabled:opacity-50">
                      {busy === order.id ? 'Saving...' : 'Submit tracking'}
                    </button>
                  </div>
                )}
                {order.transferError && (
                  <p role="status" className="mt-3 text-sm text-destructive">
                    Transfer is delayed: {order.transferError}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function humanize(value: string) {
  return value.replaceAll('_', ' ')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.message === 'string' ? value.message : fallback
}
