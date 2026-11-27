'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { useMarketplaceCart } from '@/components/marketplace/cart-provider'

export function MarketplaceCheckoutSuccess({ orderId }: { orderId: string }) {
  const { clear } = useMarketplaceCart()

  useEffect(() => {
    clear()
  }, [clear])

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center">
      <CheckCircle2 className="mx-auto size-14 text-accent" />
      <h1 className="mt-5 text-3xl font-bold">Thank you for your order</h1>
      <p className="mt-3 text-muted-foreground">
        Your payment is being confirmed. Sellers will prepare their items separately, and an update will be sent to your email.
      </p>
      {orderId && <p className="mt-4 text-xs text-muted-foreground">Order reference: {orderId.slice(0, 12).toUpperCase()}</p>}
      <Link href="/marketplace" className="mt-7 inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-5 font-semibold text-accent-foreground hover:bg-accent/90">
        Continue shopping
      </Link>
    </main>
  )
}
