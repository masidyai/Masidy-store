/**
 * Masidy Product Types
 * Core data structures for the Masidy store catalog
 */

/** Product variant from Masidy catalog */
export interface MasidyVariant {
  id: number
  external_id: string
  product_id: number
  name: string
  size: string
  color: string
  color_code: string
  storefront_price: string
  currency: string
  preview_url: string
  in_stock: boolean
}

/** Masidy product with its variants */
export interface MasidyProduct {
  id: number
  external_id: string
  name: string
  handle: string
  thumbnail_url: string
  category: string
  description: string
  tags: string[]
  variants: MasidyVariant[]
  gallery: string[]
  createdAt: string
}

/**
 * Normalized product shape consumed by the storefront UI.
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
