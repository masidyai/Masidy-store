import type { Metadata } from 'next'
import { StoreListing } from '@/components/search/store-listing'
import { getCollections, getProducts } from '@/lib/products/api'

export const metadata: Metadata = {
  title: 'Shop All',
  description: 'Browse every made-to-order product in the Masidy catalog.',
}

export const dynamic = 'force-dynamic'

type SortValue = 'featured' | 'latest' | 'price-asc' | 'price-desc'

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string; q?: string }>
}) {
  const { sort, q } = await searchParams
  const [products, collections] = await Promise.all([
    getProducts({ sort: (sort as SortValue) ?? 'featured', query: q }),
    getCollections(),
  ])

  const title = q ? `Results for “${q}”` : 'Shop All'
  const description = q
    ? `${products.length} ${products.length === 1 ? 'product' : 'products'} matching your search.`
    : 'Everything in the Masidy catalog, ready for you.'

  return (
    <StoreListing
      title={title}
      description={description}
      products={products}
      collections={collections}
      activeCollection="all"
      sort={sort ?? 'featured'}
    />
  )
}
