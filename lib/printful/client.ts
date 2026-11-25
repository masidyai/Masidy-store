import type { PrintfulSyncProduct, PrintfulSyncVariant } from './types'
import { env } from 'cloudflare:workers'

/**
 * ---------------------------------------------------------------------------
 * Live Printful client
 * ---------------------------------------------------------------------------
 * Talks to the Printful Sync API and maps responses onto our internal
 * `PrintfulSyncProduct` shape so the rest of the app is unchanged.
 *
 * Env:
 *   PRINTFUL_API_TOKEN  (required)  – Bearer token from Printful dashboard.
 *   PRINTFUL_STORE_ID   (optional)  – needed for account-level tokens that
 *                                     have access to multiple stores.
 *
 * Docs: https://developers.printful.com/docs/
 */

const API_BASE = 'https://api.printful.com'
// Cache Printful responses for an hour; revalidateTag/refresh could be added later.
const REVALIDATE_SECONDS = 3600

export function hasPrintfulCredentials(): boolean {
  return Boolean(env.PRINTFUL_API_TOKEN)
}

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${env.PRINTFUL_API_TOKEN}`,
    'Content-Type': 'application/json',
  }
  if (env.PRINTFUL_STORE_ID) {
    headers['X-PF-Store-Id'] = env.PRINTFUL_STORE_ID
  }
  return headers
}

async function pf<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: authHeaders(),
    next: { revalidate: REVALIDATE_SECONDS },
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Printful API ${res.status} on ${path}: ${body.slice(0, 200)}`)
  }
  const json = (await res.json()) as { code: number; result: T; error?: { message: string } }
  if (json.error) throw new Error(`Printful API error on ${path}: ${json.error.message}`)
  return json.result
}

/* -------------------------------------------------------------------------- */
/* Raw Printful response shapes (subset of fields we use)                     */
/* -------------------------------------------------------------------------- */

interface RawStoreProductListItem {
  id: number
  external_id: string
  name: string
  thumbnail_url: string
  variants: number
}

interface RawSyncProductDetail {
  sync_product: {
    id: number
    external_id: string
    name: string
    thumbnail_url: string
  }
  sync_variants: RawSyncVariant[]
}

interface RawSyncVariant {
  id: number
  external_id: string
  sync_product_id: number
  name: string
  variant_id: number // catalog variant id
  retail_price: string
  currency: string
  files: { type: string; preview_url: string }[]
}

interface RawCatalogVariant {
  variant: {
    id: number
    product_id: number
    name: string
    size: string
    color: string
    color_code: string
    image: string
    price: string
    in_stock: boolean
  }
}

/* -------------------------------------------------------------------------- */
/* Mapping helpers                                                            */
/* -------------------------------------------------------------------------- */

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

/** Printful doesn't return a merchandising category, so infer one from the name. */
function inferCategory(name: string): 'apparel' | 'accessories' | 'prints' {
  const n = name.toLowerCase()
  if (/(tee|t-shirt|shirt|hoodie|sweatshirt|crewneck|jacket|tank|long ?sleeve|joggers|shorts|dress)/.test(n)) {
    return 'apparel'
  }
  if (/(poster|print|canvas|framed|wall art)/.test(n)) return 'prints'
  if (/(mug|tote|bag|cap|hat|beanie|bottle|sticker|pillow|towel|socks|phone|case|apron)/.test(n)) {
    return 'accessories'
  }
  return 'apparel'
}

function inferTags(name: string, category: string): string[] {
  const n = name.toLowerCase()
  const tags = new Set<string>([category])
  if (/tee|t-shirt|shirt/.test(n)) tags.add('t-shirts')
  if (/hoodie/.test(n)) tags.add('hoodies')
  if (/sweatshirt|crewneck/.test(n)) tags.add('sweatshirts')
  if (/mug|bottle/.test(n)) tags.add('drinkware')
  if (/tote|bag/.test(n)) tags.add('bags')
  if (/cap|hat|beanie/.test(n)) tags.add('hats')
  if (/poster|print|canvas/.test(n)) tags.add('prints')
  return [...tags]
}

function previewFor(variant: RawSyncVariant, fallback: string): string {
  const preview = variant.files.find((f) => f.type === 'preview')?.preview_url
  return preview || fallback
}

/**
 * Fetch a catalog variant (color/size/color_code/stock). These are cached and
 * heavily shared across sync variants, so we memoize per request run.
 */
async function getCatalogVariant(
  id: number,
  cache: Map<number, RawCatalogVariant['variant'] | null>,
): Promise<RawCatalogVariant['variant'] | null> {
  if (cache.has(id)) return cache.get(id) ?? null
  try {
    const result = await pf<RawCatalogVariant>(`/products/variant/${id}`)
    cache.set(id, result.variant)
    return result.variant
  } catch {
    cache.set(id, null)
    return null
  }
}

/* -------------------------------------------------------------------------- */
/* Public: fetch + normalize into PrintfulSyncProduct[]                        */
/* -------------------------------------------------------------------------- */

export async function fetchPrintfulProducts(): Promise<PrintfulSyncProduct[]> {
  const list = await pf<RawStoreProductListItem[]>('/store/products')
  const catalogCache = new Map<number, RawCatalogVariant['variant'] | null>()

  const products = await Promise.all(
    list.map(async (item): Promise<PrintfulSyncProduct | null> => {
      try {
        const detail = await pf<RawSyncProductDetail>(`/store/products/${item.id}`)
        const sp = detail.sync_product

        const variants: PrintfulSyncVariant[] = await Promise.all(
          detail.sync_variants.map(async (sv): Promise<PrintfulSyncVariant> => {
            const catalog = await getCatalogVariant(sv.variant_id, catalogCache)
            const color = catalog?.color || 'Default'
            const size = catalog?.size || 'One Size'
            return {
              id: sv.id,
              external_id: sv.external_id,
              sync_product_id: sv.sync_product_id,
              name: `${color} / ${size}`,
              size,
              color,
              color_code: catalog?.color_code || '#cccccc',
              retail_price: sv.retail_price,
              currency: sv.currency || 'USD',
              preview_url: previewFor(sv, catalog?.image || sp.thumbnail_url),
              in_stock: catalog?.in_stock ?? true,
            }
          }),
        )

        const category = inferCategory(sp.name)
        const gallery = [...new Set(variants.map((v) => v.preview_url))].slice(0, 6)

        return {
          id: sp.id,
          external_id: sp.external_id,
          name: sp.name,
          handle: slugify(sp.external_id || sp.name),
          thumbnail_url: sp.thumbnail_url,
          category,
          description: `${sp.name}, printed to order by Masidy. Made on demand so nothing goes to waste.`,
          tags: inferTags(sp.name, category),
          gallery: gallery.length ? gallery : [sp.thumbnail_url],
          createdAt: new Date().toISOString(),
          variants,
        }
      } catch (err) {
        console.log('[v0] Printful product mapping failed for', item.id, (err as Error).message)
        return null
      }
    }),
  )

  return products.filter((p): p is PrintfulSyncProduct => p !== null)
}
