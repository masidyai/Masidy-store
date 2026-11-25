import type { PrintfulSyncProduct, Product, ProductVariant, Collection } from './types'
import { MOCK_PRODUCTS, MOCK_COLLECTIONS } from './mock-data'
import { fetchPrintfulProducts, hasPrintfulCredentials } from './client'

/**
 * ---------------------------------------------------------------------------
 * DATA SOURCE SEAM
 * ---------------------------------------------------------------------------
 * When PRINTFUL_API_TOKEN is set, products are imported live from the Printful
 * Sync API (see ./client.ts). Without it, the store falls back to the mock
 * catalog so the preview always renders. Either way the normalized `Product`
 * type the UI depends on is identical.
 */
async function getRawProducts(): Promise<PrintfulSyncProduct[]> {
  if (hasPrintfulCredentials()) {
    try {
      const products = await fetchPrintfulProducts()
      if (products.length > 0) return products
      console.log('[v0] Printful returned no products; falling back to mock catalog.')
    } catch (err) {
      console.log('[v0] Printful fetch failed; falling back to mock catalog:', (err as Error).message)
    }
  }
  return MOCK_PRODUCTS
}

function normalize(raw: PrintfulSyncProduct): Product {
  const variants: ProductVariant[] = raw.variants.map((v) => ({
    id: String(v.id),
    title: v.name,
    size: v.size,
    color: v.color,
    colorCode: v.color_code,
    price: Number.parseFloat(v.retail_price),
    currency: v.currency,
    image: v.preview_url,
    available: v.in_stock,
  }))

  const prices = variants.map((v) => v.price)
  const sizes = [...new Set(variants.map((v) => v.size))]
  const colorMap = new Map<string, string>()
  for (const v of variants) {
    if (!colorMap.has(v.color)) colorMap.set(v.color, v.colorCode)
  }

  return {
    id: String(raw.id),
    handle: raw.handle,
    title: raw.name,
    description: raw.description,
    category: raw.category,
    tags: raw.tags,
    featuredImage: raw.thumbnail_url,
    images: raw.gallery,
    priceRange: {
      min: Math.min(...prices),
      max: Math.max(...prices),
      currency: variants[0]?.currency ?? 'USD',
    },
    options: {
      sizes,
      colors: [...colorMap.entries()].map(([name, code]) => ({ name, code })),
    },
    variants,
    createdAt: raw.createdAt,
  }
}

export async function getProducts(options?: {
  collection?: string
  sort?: 'latest' | 'price-asc' | 'price-desc' | 'featured'
  query?: string
}): Promise<Product[]> {
  const raw = await getRawProducts()
  let products = raw.map(normalize)

  if (options?.collection && options.collection !== 'all') {
    products = products.filter((p) => p.category === options.collection)
  }

  if (options?.query) {
    const q = options.query.toLowerCase()
    products = products.filter(
      (p) =>
        p.title.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q)),
    )
  }

  switch (options?.sort) {
    case 'price-asc':
      products.sort((a, b) => a.priceRange.min - b.priceRange.min)
      break
    case 'price-desc':
      products.sort((a, b) => b.priceRange.min - a.priceRange.min)
      break
    case 'latest':
      products.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
      break
    default:
      break
  }

  return products
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  const raw = await getRawProducts()
  const found = raw.find((p) => p.handle === handle)
  return found ? normalize(found) : undefined
}

export async function getRelatedProducts(handle: string, limit = 4): Promise<Product[]> {
  const raw = await getRawProducts()
  const current = raw.find((p) => p.handle === handle)
  if (!current) return []
  return raw
    .filter((p) => p.handle !== handle && p.category === current.category)
    .map(normalize)
    .slice(0, limit)
}

export async function getFeaturedProducts(limit = 3): Promise<Product[]> {
  const raw = await getRawProducts()
  const products = raw.map(normalize)
  const featured = products.filter((p) => p.tags.includes('bestseller'))
  // Live Printful products have no "bestseller" tag, so fall back to the catalog.
  return (featured.length >= limit ? featured : products).slice(0, limit)
}

export async function getCollections(): Promise<Collection[]> {
  return MOCK_COLLECTIONS
}

export function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount)
}
