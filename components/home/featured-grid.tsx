import Image from 'next/image'
import Link from 'next/link'
import type { Product } from '@/lib/products/types'
import { formatPrice } from '@/lib/products/format'
import { cn } from '@/lib/utils'

function FeaturedTile({
  product,
  large = false,
  priority = false,
}: {
  product: Product
  large?: boolean
  priority?: boolean
}) {
  return (
    <Link
      href={`/product/${product.handle}`}
      className={cn(
        'group relative flex overflow-hidden rounded-lg border border-border bg-card',
        large
          ? 'aspect-[4/5] md:col-span-2 md:row-span-2 md:aspect-auto'
          : 'aspect-square',
      )}
    >
      <Image
        src={product.featuredImage || '/placeholder.svg'}
        alt={product.title}
        fill
        sizes={large ? '(max-width: 768px) 50vw, 66vw' : '(max-width: 768px) 45vw, 33vw'}
        priority={priority}
        className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="absolute inset-x-0 bottom-0 flex items-end p-2 sm:p-3 md:p-4 lg:p-6">
        <div className="flex flex-wrap items-center gap-1.5 rounded-md bg-background/90 px-2 py-1.5 backdrop-blur-md sm:gap-2 sm:px-3 sm:py-2 md:px-4 md:py-2.5">
          <span className="text-[10px] font-medium text-foreground sm:text-xs md:text-sm">{product.title}</span>
          <span className="rounded-full bg-accent px-1.5 py-0.5 text-[9px] font-semibold text-accent-foreground tabular-nums sm:px-2 sm:py-1 sm:text-[11px] md:px-2.5 md:text-xs">
            {formatPrice(product.priceRange.min, product.priceRange.currency)}
          </span>
        </div>
      </div>
    </Link>
  )
}

export function FeaturedGrid({ products }: { products: Product[] }) {
  if (products.length < 3) return null
  const [first, second, third] = products
  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-4">
        <FeaturedTile product={first} priority />
        <FeaturedTile product={second} />
        <FeaturedTile product={third} />
      </div>
    </section>
  )
}
