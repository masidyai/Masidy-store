import type { Product } from '@/lib/products/types'
import { ProductCard } from './product-card'

export function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center rounded-md border border-dashed border-border py-16 text-center">
        <p className="text-base font-medium">No products found</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try a different search or browse all products.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-2.5 gap-y-5 sm:gap-x-4 sm:gap-y-8 md:grid-cols-3 lg:grid-cols-4">
      {products.map((product, i) => (
        <ProductCard key={product.id} product={product} priority={i < 4} />
      ))}
    </div>
  )
}
