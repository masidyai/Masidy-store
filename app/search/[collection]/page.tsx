import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { StoreListing } from '@/components/search/store-listing'
import { getCollections, getProducts } from '@/lib/products/api'

export const dynamic = 'force-dynamic'

type SortValue = 'featured' | 'latest' | 'price-asc' | 'price-desc'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ collection: string }>
}): Promise<Metadata> {
  const { collection } = await params
  const collections = await getCollections()
  const found = collections.find((c) => c.handle === collection)
  return {
    title: found?.title ?? 'Shop',
    description: found?.description,
  }
}

export default async function CollectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ collection: string }>
  searchParams: Promise<{ sort?: string }>
}) {
  const { collection } = await params
  const { sort } = await searchParams

  const collections = await getCollections()
  const current = collections.find((c) => c.handle === collection)
  if (!current) notFound()

  const products = await getProducts({
    collection,
    sort: (sort as SortValue) ?? 'featured',
  })

  return (
    <StoreListing
      title={current.title}
      description={current.description}
      products={products}
      collections={collections}
      activeCollection={collection}
      sort={sort ?? 'featured'}
    />
  )
}
