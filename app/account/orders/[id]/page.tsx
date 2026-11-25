import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Copy, MapPin, Package } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'
import { getOrderById } from '@/lib/db/orders'

interface OrderDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6">
        <p className="text-center text-muted-foreground">Please sign in to view your orders.</p>
      </div>
    )
  }

  const order = await getOrderById(id)

  if (!order || order.userId !== user.id) {
    notFound()
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <Link href="/account/orders" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Orders
      </Link>

      <div className="grid gap-8 md:grid-cols-3">
        <div className="md:col-span-2">
          {/* Order Header */}
          <div className="mb-8 rounded-lg border border-border bg-background p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="mt-1 font-mono text-2xl font-bold">{order.id.slice(0, 8).toUpperCase()}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Status</p>
                <span
                  className={`mt-1 inline-block rounded-full px-4 py-2 text-sm font-semibold ${
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
            <p className="mt-4 text-sm text-muted-foreground">Placed on {new Date(order.createdAt).toLocaleDateString()}</p>
          </div>

          {/* Items */}
          <div className="mb-8">
            <h2 className="mb-4 text-lg font-semibold">Items</h2>
            <div className="divide-y divide-border rounded-lg border border-border">
              {order.items.map((item) => (
                <div key={item.id} className="flex gap-4 p-6">
                  {item.image && (
                    <img src={item.image} alt={item.title} className="size-20 rounded object-cover" />
                  )}
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {item.color} / {item.size}
                    </p>
                    <p className="mt-2 font-semibold">
                      {item.currency} {item.price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{item.currency} {(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shipping Info */}
          {order.shippingAddress && (
            <div className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <MapPin className="size-5" />
                Shipping Address
              </h2>
              <div className="rounded-lg border border-border bg-background p-6">
                <p className="font-semibold">{order.shippingAddress.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{order.shippingAddress.address1}</p>
                {order.shippingAddress.address2 && (
                  <p className="text-sm text-muted-foreground">{order.shippingAddress.address2}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}
                </p>
                <p className="text-sm text-muted-foreground">{order.shippingAddress.country}</p>
              </div>
            </div>
          )}

          {/* Tracking */}
          {order.trackingNumber && (
            <div className="mb-8">
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Package className="size-5" />
                Tracking
              </h2>
              <div className="rounded-lg border border-border bg-background p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Tracking Number</p>
                    <p className="mt-1 font-mono text-lg font-bold">{order.trackingNumber}</p>
                  </div>
                  <button className="rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary">
                    <Copy className="size-4" />
                  </button>
                </div>
                {order.trackingUrl && (
                  <Link
                    href={order.trackingUrl}
                    target="_blank"
                    className="mt-4 inline-block text-sm text-primary hover:underline"
                  >
                    View tracking details →
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary Sidebar */}
        <div className="md:col-span-1">
          <div className="rounded-lg border border-border bg-secondary/40 p-6">
            <h3 className="mb-4 font-semibold">Order Summary</h3>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>
                  {order.currency} {order.subtotal.toFixed(2)}
                </span>
              </div>

              {order.shippingCost > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>
                    {order.currency} {order.shippingCost.toFixed(2)}
                  </span>
                </div>
              )}

              {order.tax > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>
                    {order.currency} {order.tax.toFixed(2)}
                  </span>
                </div>
              )}

              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>
                    {order.currency} {order.total.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-md bg-background p-4 text-sm">
              <p className="text-muted-foreground">
                Questions about this order? Contact us at{' '}
                <a href="mailto:support@masidy.store" className="text-primary hover:underline">
                  support@masidy.store
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
