import { CollectionNav } from './collection-nav'
import { SortSelect } from './sort-select'
import { ProductGrid } from '@/components/product/product-grid'
import type { Collection, Product } from '@/lib/products/types'

export function StoreListing({
  title,
  description,
  products,
  collections,
  activeCollection,
  sort,
}: {
  title: string
  description: string
  products: Product[]
  collections: Collection[]
  activeCollection: string
  sort: string
}) {
  return (
    <div className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-6 md:px-6 md:py-8 lg:py-10">
      <div className="grid gap-5 md:grid-cols-[200px_1fr] md:gap-8 lg:gap-12">
        <aside className="md:sticky md:top-24 md:self-start">
          <CollectionNav collections={collections} active={activeCollection} />
        </aside>

        <div>
          <div className="mb-3 flex flex-col gap-2.5 border-b border-border pb-3 sm:mb-4 sm:flex-row sm:items-end sm:justify-between sm:gap-3 sm:pb-4 md:mb-6 md:pb-6">
            <div>
              <h1 className="font-serif text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl lg:text-4xl">
                {title}
              </h1>
              <p className="mt-1 max-w-lg text-[11px] text-muted-foreground sm:mt-1.5 sm:text-xs md:text-sm">{description}</p>
            </div>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <span className="text-[10px] text-muted-foreground sm:text-xs">
                {products.length} {products.length === 1 ? 'item' : 'items'}
              </span>
              <SortSelect current={sort} />
            </div>
          </div>

          <ProductGrid products={products} />
        </div>
      </div>
    </div>
  )
}
