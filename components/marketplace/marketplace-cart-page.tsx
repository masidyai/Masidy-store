'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useMarketplaceCart } from '@/components/marketplace/cart-provider'
import { fromMinorUnits } from '@/lib/checkout/money'
import { formatPrice } from '@/lib/products/format'

export function MarketplaceCartPage() {
  const { items, subtotalMinor, currency, currencyMismatch, setQuantity, removeItem } = useMarketplaceCart()

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">Your marketplace bag is empty</h1>
        <p className="mt-3 text-muted-foreground">Browse products from approved independent sellers.</p>
        <Link href="/marketplace" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-accent px-5 font-semibold text-accent-foreground">
          Browse marketplace
        </Link>
      </div>
    )
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold">Marketplace bag</h1>
      <p className="mt-2 text-sm text-muted-foreground">Independent-seller items check out separately from Masidy products.</p>
      {currencyMismatch && (
        <p role="alert" className="mt-5 rounded-md border border-destructive/30 p-3 text-sm text-destructive">
          Your bag contains more than one currency. Remove items until all products use the same currency.
        </p>
      )}
      <ul className="mt-6 divide-y divide-border border-y border-border">
        {items.map((item) => (
          <li key={item.listingId} className="flex gap-4 py-4">
            <Link href={`/marketplace/${encodeURIComponent(item.listingId)}`} className="relative size-20 shrink-0 overflow-hidden rounded-md border border-border">
              <Image src={item.imageUrl} alt={item.title} fill sizes="80px" className="object-cover" unoptimized />
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/marketplace/${encodeURIComponent(item.listingId)}`} className="font-medium hover:text-accent">
                {item.title}
              </Link>
              <p className="text-sm text-muted-foreground">{item.category}</p>
              <div className="mt-2 flex items-center justify-between gap-3">
                <div className="flex items-center rounded-md border border-border">
                  <button type="button" onClick={() => setQuantity(item.listingId, item.quantity - 1)} aria-label="Decrease quantity" className="inline-flex size-8 items-center justify-center">
                    <Minus className="size-3.5" />
                  </button>
                  <span className="w-8 text-center text-sm">{item.quantity}</span>
                  <button type="button" onClick={() => setQuantity(item.listingId, item.quantity + 1)} aria-label="Increase quantity" className="inline-flex size-8 items-center justify-center">
                    <Plus className="size-3.5" />
                  </button>
                </div>
                <span className="font-semibold">{formatPrice(fromMinorUnits(item.priceMinor * item.quantity, item.currency), item.currency)}</span>
              </div>
            </div>
            <button type="button" onClick={() => removeItem(item.listingId)} aria-label={`Remove ${item.title}`} className="size-9 shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-destructive">
              <Trash2 className="mx-auto size-4" />
            </button>
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between text-lg font-semibold">
        <span>Subtotal</span>
        <span>{formatPrice(fromMinorUnits(subtotalMinor, currency), currency)}</span>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">Listed prices include applicable tax where required. Seller shipping is calculated at checkout.</p>
      <Link
        href="/marketplace/checkout"
        aria-disabled={currencyMismatch}
        className={`mt-6 flex min-h-12 items-center justify-center rounded-md bg-accent px-5 font-semibold text-accent-foreground ${currencyMismatch ? 'pointer-events-none opacity-50' : 'hover:bg-accent/90'}`}
      >
        Continue to checkout
      </Link>
    </main>
  )
}
