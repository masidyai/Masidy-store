'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, ShoppingBag, X } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatPrice } from '@/lib/products/format'
import { cn } from '@/lib/utils'

export function CartDrawer() {
  const {
    items,
    isOpen,
    closeCart,
    removeItem,
    updateQuantity,
    subtotal,
    currency,
    totalQuantity,
  } = useCart()
  const [loading, setLoading] = useState(false)

  // Lock scroll while open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeCart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, closeCart])

  function handleCheckout() {
    closeCart()
    window.location.href = '/checkout'
  }

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden={!isOpen}
        onClick={closeCart}
        className={cn(
          'fixed inset-0 z-50 bg-foreground/30 backdrop-blur-[2px] transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Shopping cart"
        aria-modal="true"
        className={cn(
          'fixed right-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col bg-background shadow-xl transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-serif text-xl font-semibold">
            Your Bag {totalQuantity > 0 && <span className="text-muted-foreground">({totalQuantity})</span>}
          </h2>
          <button
            type="button"
            onClick={closeCart}
            className="inline-flex size-8 items-center justify-center rounded-md text-foreground hover:bg-muted"
            aria-label="Close cart"
          >
            <X className="size-5" />
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="size-7 text-muted-foreground" />
            </div>
            <p className="text-base font-medium">Your bag is empty</p>
            <p className="max-w-xs text-sm text-muted-foreground">
              Made with care and built to last. Find something you love.
            </p>
            <button
              type="button"
              onClick={closeCart}
              className="mt-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Continue shopping
            </button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
              {items.map((item) => (
                <li key={item.variantId} className="flex gap-4 py-4">
                  <Link
                    href={`/product/${item.productHandle}`}
                    onClick={closeCart}
                    className="relative size-20 shrink-0 overflow-hidden rounded-md border border-border bg-card"
                  >
                    <Image
                      src={item.image || '/placeholder.svg'}
                      alt={item.title}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </Link>
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-2">
                      <Link
                        href={`/product/${item.productHandle}`}
                        onClick={closeCart}
                        className="text-sm font-medium leading-snug hover:text-accent"
                      >
                        {item.title}
                      </Link>
                      <button
                        type="button"
                        onClick={() => removeItem(item.variantId)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${item.title}`}
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.color}
                      {item.size !== 'One Size' ? ` / ${item.size}` : ''}
                    </p>
                    <div className="mt-auto flex items-center justify-between pt-2">
                      <div className="flex items-center rounded-md border border-border">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity - 1)}
                          className="inline-flex size-7 items-center justify-center text-foreground hover:bg-muted"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.variantId, item.quantity + 1)}
                          className="inline-flex size-7 items-center justify-center text-foreground hover:bg-muted"
                          aria-label="Increase quantity"
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <span className="text-sm font-medium tabular-nums">
                        {formatPrice(item.price * item.quantity, item.currency)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <div className="border-t border-border px-5 py-4">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>Shipping</span>
                <span>Calculated at checkout</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-base font-semibold">
                <span>Subtotal</span>
                <span className="tabular-nums">{formatPrice(subtotal, currency)}</span>
              </div>
              <button
                type="button"
                onClick={handleCheckout}
                className="mt-4 w-full rounded-md bg-accent py-3 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90"
              >
                Checkout
              </button>
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Taxes and shipping calculated at checkout
              </p>
            </div>
          </>
        )}
      </aside>
    </>
  )
}
