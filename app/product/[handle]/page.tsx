import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ChevronRight } from 'lucide-react'
import { ProductDetails } from '@/components/product/product-details'
import { ProductCarousel } from '@/components/home/product-carousel'
import { ProductGallery } from '@/components/product/product-gallery'
import { getProduct, getRelatedProducts } from '@/lib/products/api'

export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ handle: string }>
}): Promise<Metadata> {
  const { handle } = await params
  const product = await getProduct(handle)
  if (!product) return { title: 'Product not found' }
  return {
    title: product.title,
    description: product.description,
    openGraph: {
      images: [{ url: product.featuredImage }],
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ handle: string }>
}) {
  const { handle } = await params
  const product = await getProduct(handle)
  if (!product) notFound()

  const related = await getRelatedProducts(handle, 8)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:py-8 md:px-6 md:py-10">
      {/* Breadcrumb */}
      <nav
        aria-label="Breadcrumb"
        className="mb-4 flex items-center gap-1.5 text-xs text-muted-foreground sm:mb-6 sm:text-sm"
      >
        <Link href="/search" className="hover:text-foreground">
          Shop
        </Link>
        <ChevronRight className="size-3 sm:size-3.5" />
        <Link href={`/search/${product.category}`} className="capitalize hover:text-foreground">
          {product.category}
        </Link>
        <ChevronRight className="size-3 sm:size-3.5" />
        <span className="truncate text-foreground">{product.title}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:gap-14">
        {/* Gallery */}
        <ProductGallery product={product} />

        {/* Details */}
        <div className="md:pt-2">
          <ProductDetails product={product} />
        </div>
      </div>

      {related.length > 0 && (
        <div className="mt-12 sm:mt-16 md:mt-20">
          <ProductCarousel title="You might also like" products={related} />
        </div>
      )}
    </div>
  )
}
