'use client'

import { useMemo, useState, useEffect } from 'react'
import { Check, Plus } from 'lucide-react'
import type { Product, ProductVariant } from '@/lib/products/types'
import { formatPrice } from '@/lib/products/format'
import { useCart } from '@/lib/cart-context'
import { cn } from '@/lib/utils'

function findVariant(product: Product, color: string, size: string): ProductVariant | undefined {
  return product.variants.find((v) => v.color === color && v.size === size)
}

export function ProductDetails({ product }: { product: Product }) {
  const { addItem } = useCart()
  const hasColors = product.options.colors.length > 1
  const hasSizes = product.options.sizes.length > 1 || product.options.sizes[0] !== 'One Size'

  const [color, setColor] = useState(product.options.colors[0]?.name ?? '')
  const [size, setSize] = useState(product.options.sizes[0] ?? '')
  const [added, setAdded] = useState(false)

  const selectedVariant = useMemo(
    () => findVariant(product, color, size) ?? product.variants[0],
    [product, color, size],
  )

  // Notify gallery when variant changes
  useEffect(() => {
    if (selectedVariant?.image) {
      const event = new CustomEvent('variant-changed', {
        detail: { image: selectedVariant.image },
      })
      window.dispatchEvent(event)
    }
  }, [selectedVariant])

  // Sizes available for the selected color
  const availabilityForColor = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const s of product.options.sizes) {
      const v = findVariant(product, color, s)
      map.set(s, v ? v.available : false)
    }
    return map
  }, [product, color])

  function handleAdd() {
    if (!selectedVariant || !selectedVariant.available) return
    addItem(product, selectedVariant, 1)
    setAdded(true)
    setTimeout(() => setAdded(false), 1800)
  }

  const soldOut = selectedVariant ? !selectedVariant.available : false

  return (
    <div className="flex flex-col">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-accent sm:text-xs">
        {product.category}
      </p>
      <h1 className="mt-1.5 font-serif text-2xl font-semibold leading-tight tracking-tight sm:mt-2 sm:text-3xl md:text-4xl">
        {product.title}
      </h1>
      <p className="mt-2 text-xl font-medium tabular-nums sm:mt-3 sm:text-2xl">
        {formatPrice(selectedVariant?.price ?? product.priceRange.min, product.priceRange.currency)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Shipping, taxes, and any setup fees are calculated at checkout.
      </p>

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground sm:mt-6 sm:text-sm">{product.description}</p>

      {hasColors && (
        <div className="mt-6 sm:mt-8">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-xs font-medium sm:text-sm">Color</span>
            <span className="text-xs text-muted-foreground sm:text-sm">{color}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {product.options.colors.map((c) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(c.name)}
                aria-label={c.name}
                aria-pressed={color === c.name}
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border transition-all sm:size-9',
                  color === c.name
                    ? 'border-foreground ring-2 ring-foreground ring-offset-2 ring-offset-background'
                    : 'border-border hover:border-foreground/50',
                )}
              >
                <span
                  className="size-5 rounded-full border border-black/10 sm:size-6"
                  style={{ backgroundColor: c.code }}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {hasSizes && (
        <div className="mt-5 sm:mt-6">
          <span className="mb-2 block text-xs font-medium sm:text-sm">
            {product.category === 'prints' ? 'Size' : 'Size'}
          </span>
          <div className="flex flex-wrap gap-2">
            {product.options.sizes.map((s) => {
              const available = availabilityForColor.get(s) ?? true
              return (
                <button
                  key={s}
                  type="button"
                  disabled={!available}
                  onClick={() => setSize(s)}
                  aria-pressed={size === s}
                  className={cn(
                    'min-w-10 rounded-md border px-2.5 py-1.5 text-xs transition-colors sm:min-w-11 sm:px-3 sm:py-2 sm:text-sm',
                    size === s
                      ? 'border-foreground bg-foreground text-background'
                      : 'border-border text-foreground hover:border-foreground/50',
                    !available &&
                      'cursor-not-allowed border-dashed text-muted-foreground/50 line-through hover:border-border',
                  )}
                >
                  {s}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={soldOut}
        className={cn(
          'mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-md text-xs font-semibold transition-colors sm:mt-8 sm:h-12 sm:text-sm',
          soldOut
            ? 'cursor-not-allowed bg-muted text-muted-foreground'
            : 'bg-accent text-accent-foreground hover:bg-accent/90',
        )}
      >
        {soldOut ? (
          'Sold out'
        ) : added ? (
          <>
            <Check className="size-3.5 sm:size-4" /> Added to bag
          </>
        ) : (
          <>
            <Plus className="size-3.5 sm:size-4" /> Add to bag
          </>
        )}
      </button>

      <ul className="mt-6 space-y-2 border-t border-border pt-5 text-xs text-muted-foreground sm:mt-8 sm:pt-6 sm:text-sm">
        <li>Made to order — ships in 2–5 business days.</li>
        <li>Free returns within 30 days.</li>
        <li>Made with responsibly sourced materials.</li>
      </ul>
    </div>
  )
}
