import type { MasidyProduct, Product, ProductVariant, Collection } from './types'
import { MOCK_PRODUCTS, MOCK_COLLECTIONS } from './mock-data'
import { env } from 'cloudflare:workers'

/**
 * Masidy Product API
 * Fetches products from Printful but presents them as Masidy brand
 */

// Printful API configuration
const PRINTFUL_API_BASE = 'https://api.printful.com'
function hasPrintfulCredentials(): boolean {
  return Boolean(env.PRINTFUL_API_TOKEN)
}

async function fetchFromPrintful<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.PRINTFUL_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
  if (env.PRINTFUL_STORE_ID) {
    headers['X-PF-Store-Id'] = env.PRINTFUL_STORE_ID
  }

  const res = await fetch(`${PRINTFUL_API_BASE}${path}`, {
    headers,
    next: { revalidate: 3600 }, // Cache for 1 hour
  })

  if (!res.ok) {
    throw new Error(`Printful API error: ${res.status}`)
  }

  const json = (await res.json()) as { result: T }
  return json.result
}

async function getRawProducts(): Promise<MasidyProduct[]> {
  // Try to fetch from Printful first
  if (hasPrintfulCredentials()) {
    try {
      const products = await fetchPrintfulProductsAsMasidy()
      if (products.length > 0) {
        console.log(`[Masidy] Loaded ${products.length} products from Printful`)
        return products
      }
    } catch (err) {
      console.log('[Masidy] Printful fetch failed, using mock data:', (err as Error).message)
    }
  }

  // Fallback to mock data
  return MOCK_PRODUCTS
}

async function fetchPrintfulProductsAsMasidy(): Promise<MasidyProduct[]> {
  // Get list of sync products from Printful
  const list = await fetchFromPrintful<any[]>('/store/products')
  
  // Cache for catalog variants to avoid duplicate API calls
  const catalogCache = new Map<number, any>()

  const products = await Promise.all(
    list.map(async (item): Promise<MasidyProduct | null> => {
      try {
        const detail = await fetchFromPrintful<any>(`/store/products/${item.id}`)
        const sp = detail.sync_product
        const syncVariants = detail.sync_variants || []

        // Build variants with proper color/size data from catalog
        const variants = await Promise.all(
          syncVariants.map(async (sv: any) => {
            // Get catalog variant info for accurate color/size data
            let catalogVariant = null
            if (sv.variant_id) {
              if (catalogCache.has(sv.variant_id)) {
                catalogVariant = catalogCache.get(sv.variant_id)
              } else {
                try {
                  const catalogData = await fetchFromPrintful<any>(`/products/variant/${sv.variant_id}`)
                  catalogVariant = catalogData.variant
                  catalogCache.set(sv.variant_id, catalogVariant)
                } catch {
                  // If catalog fetch fails, continue without it
                }
              }
            }

            // Get the preview image from files or use product thumbnail as fallback
            const previewImage = sv.files?.find((f: any) => f.type === 'preview')?.preview_url 
              || sv.files?.[0]?.preview_url 
              || catalogVariant?.image
              || sp.thumbnail_url 
              || '/placeholder.svg'

            return {
              id: sv.id,
              external_id: sv.external_id,
              product_id: sp.id,
              name: sv.name || catalogVariant?.name || 'Default',
              size: catalogVariant?.size || extractSize(sv.name) || 'One Size',
              color: catalogVariant?.color || extractColor(sv.name) || 'Default',
              color_code: catalogVariant?.color_code || '#cccccc',
              retail_price: sv.retail_price || '0.00',
              currency: sv.currency || 'USD',
              preview_url: previewImage,
              in_stock: catalogVariant?.in_stock !== false,
            }
          })
        )

        // Collect all unique images from sync variants
        const allImages = new Set<string>()
        
        // Add main thumbnail first
        if (sp.thumbnail_url) {
          allImages.add(sp.thumbnail_url)
        }

        // Add all variant preview images
        syncVariants.forEach((sv: any) => {
          if (sv.files) {
            sv.files.forEach((file: any) => {
              if (file.preview_url) {
                allImages.add(file.preview_url)
              }
              if (file.thumbnail_url) {
                allImages.add(file.thumbnail_url)
              }
            })
          }
        })

        // Convert Set to Array for gallery
        const gallery = Array.from(allImages).filter(url => url && url !== '/placeholder.svg')

        return {
          id: sp.id,
          external_id: sp.external_id,
          name: sp.name,
          handle: slugify(sp.external_id || sp.name),
          thumbnail_url: sp.thumbnail_url,
          category: inferCategory(sp.name),
          description: `${sp.name} from Masidy. Quality crafted for everyday wear.`,
          tags: inferTags(sp.name),
          variants,
          gallery: gallery.length > 0 ? gallery : [sp.thumbnail_url],
          createdAt: new Date().toISOString(),
        }
      } catch (err) {
        console.error('[Masidy] Failed to fetch product:', item.id, err)
        return null
      }
    }),
  )

  return products.filter((p): p is MasidyProduct => p !== null)
}

// Helper functions
function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function extractSize(name: string): string | null {
  const match = name.match(/\b(XS|S|M|L|XL|XXL|2XL|3XL|\d+oz)\b/i)
  return match ? match[1] : null
}

function extractColor(name: string): string | null {
  const match = name.match(/\b(Black|White|Grey|Gray|Blue|Red|Green|Navy|Heather|Bone|Sand|Olive|Charcoal)\b/i)
  return match ? match[1] : null
}

function inferCategory(name: string): 'apparel' | 'accessories' {
  const n = name.toLowerCase()
  if (/(tee|t-shirt|shirt|hoodie|sweatshirt|crewneck|tank)/.test(n)) {
    return 'apparel'
  }
  return 'accessories'
}

function inferTags(name: string): string[] {
  const n = name.toLowerCase()
  const tags: string[] = []
  if (/tee|t-shirt/.test(n)) tags.push('t-shirts')
  if (/hoodie/.test(n)) tags.push('hoodies')
  if (/sweatshirt|crewneck/.test(n)) tags.push('sweatshirts')
  if (/mug|bottle/.test(n)) tags.push('drinkware')
  if (/tote|bag/.test(n)) tags.push('bags')
  if (/cap|hat|beanie/.test(n)) tags.push('hats')
  return tags
}

function normalize(raw: MasidyProduct): Product {
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
  return (featured.length >= limit ? featured : products).slice(0, limit)
}

export async function getCollections(): Promise<Collection[]> {
  return MOCK_COLLECTIONS
}
