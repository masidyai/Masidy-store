'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Package } from 'lucide-react'
import type { Order } from '@/lib/db/orders'

export default function OrderHistoryPage() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function loadOrders() {
      try {
        const response = await fetch('/api/account/orders')
        if (!response.ok) {
          throw new Error('Failed to load orders')
        }
        const data = await response.json()
        setOrders(data.orders || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load orders')
      } finally {
        setLoading(false)
      }
    }

    loadOrders()
  }, [])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="text-center">
          <p className="text-muted-foreground">Loading your orders...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-red-700">{error}</p>
        </div>
      </div>
    )
  }

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6">
        <div className="rounded-lg border border-border bg-secondary/40 p-12 text-center">
          <Package className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h2 className="mb-2 text-xl font-semibold">No orders yet</h2>
          <p className="mb-6 text-muted-foreground">You haven't placed any orders yet. Start shopping!</p>
          <Link
            href="/search"
            className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Browse Products
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="mb-8 text-3xl font-bold">Order History</h1>

      <div className="space-y-4">
        {orders.map((order) => (
          <Link
            key={order.id}
            href={`/account/orders/${order.id}`}
            className="block rounded-lg border border-border bg-background p-6 transition-colors hover:bg-secondary/40"
          >
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="mt-1 font-mono text-lg font-semibold">{order.id.slice(0, 8).toUpperCase()}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="mt-1 font-semibold">{new Date(order.createdAt).toLocaleDateString()}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="mt-1 font-semibold">
                  {order.currency} {order.total.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <div className="mt-1">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                      order.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : order.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : order.status === 'failed'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
            </div>

            {order.items.length > 0 && (
              <div className="mt-4 border-t border-border pt-4">
                <p className="text-sm text-muted-foreground">
                  {order.items.length} item{order.items.length !== 1 ? 's' : ''}
                </p>
                <div className="mt-2 space-y-1">
                  {order.items.slice(0, 2).map((item) => (
                    <p key={item.id} className="text-sm">
                      {item.title} — {item.color}/{item.size} × {item.quantity}
                    </p>
                  ))}
                  {order.items.length > 2 && <p className="text-sm text-muted-foreground">+{order.items.length - 2} more</p>}
                </div>
              </div>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
