import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/products/types'
import { formatPrice } from '@/lib/products/format'
import { cn } from '@/lib/utils'

export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: Product
  priority?: boolean
  className?: string
}) {
  const { priceRange } = product
  const isNew = product.tags.includes('new')

  return (
    <Link
      href={`/product/${product.handle}`}
      className={cn('group flex flex-col gap-1.5 sm:gap-2', className)}
    >
      <div className="relative aspect-square overflow-hidden rounded-md border border-border bg-card">
        <Image
          src={product.featuredImage || '/placeholder.svg'}
          alt={product.title}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 33vw, 25vw"
          priority={priority}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
        {isNew && (
          <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-foreground backdrop-blur sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[10px]">
            New
          </span>
        )}
      </div>
      <div className="mt-1 flex items-start justify-between gap-1.5 sm:mt-1.5 sm:gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground transition-colors group-hover:text-accent sm:text-xs">
            {product.title}
          </h3>
          {product.options.colors.length > 1 && (
            <p className="mt-0.5 text-[9px] text-muted-foreground sm:text-[10px]">
              {product.options.colors.length} colors
            </p>
          )}
        </div>
        <p className="shrink-0 text-[11px] font-medium tabular-nums text-foreground sm:text-xs">
          {priceRange.min === priceRange.max
            ? formatPrice(priceRange.min, priceRange.currency)
            : `${formatPrice(priceRange.min, priceRange.currency)}`}
        </p>
      </div>
    </Link>
  )
}
