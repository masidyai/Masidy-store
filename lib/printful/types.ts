/**
 * Types modeled on the Printful API "Sync Products" / "Store Products"
 * responses (https://developers.printful.com/docs/#tag/Sync-API).
 *
 * We keep the shapes close to Printful so that swapping the mock data
 * source for real API calls later requires no changes to the UI layer.
 */

/** Raw Printful sync variant (subset of fields we use). */
export interface PrintfulSyncVariant {
  id: number
  external_id: string
  sync_product_id: number
  name: string
  /** e.g. "S", "M", "L" */
  size: string
  /** e.g. "Black", "Heather Grey" */
  color: string
  /** hex color for the swatch */
  color_code: string
  /** decimal string, matching Printful ("25.00") */
  retail_price: string
  currency: string
  /** product image / mockup for this variant */
  preview_url: string
  in_stock: boolean
}

/** Raw Printful sync product with its variants. */
export interface PrintfulSyncProduct {
  id: number
  external_id: string
  name: string
  /** URL-friendly identifier we use for routing */
  handle: string
  thumbnail_url: string
  /** product category / collection slug */
  category: string
  description: string
  /** marketing tags used for collections + filtering */
  tags: string[]
  variants: PrintfulSyncVariant[]
  /** additional gallery images */
  gallery: string[]
  createdAt: string
}

/**
 * Normalized product shape consumed by the storefront UI.
 * This is the single type the components depend on.
 */
export interface Product {
  id: string
  handle: string
  title: string
  description: string
  category: string
  tags: string[]
  featuredImage: string
  images: string[]
  priceRange: {
    min: number
    max: number
    currency: string
  }
  options: {
    sizes: string[]
    colors: { name: string; code: string }[]
  }
  variants: ProductVariant[]
  createdAt: string
}

export interface ProductVariant {
  id: string
  title: string
  size: string
  color: string
  colorCode: string
  price: number
  currency: string
  image: string
  available: boolean
}

export interface Collection {
  handle: string
  title: string
  description: string
}

export interface CartItem {
  variantId: string
  productId: string
  productHandle: string
  title: string
  variantTitle: string
  size: string
  color: string
  price: number
  currency: string
  image: string
  quantity: number
}
