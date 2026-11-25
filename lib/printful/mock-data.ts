import type { PrintfulSyncProduct, Collection } from './types'

/**
 * Mock catalog shaped like the Printful Sync API response.
 * Replace `getRawProducts()` in ./api.ts with real Printful fetches
 * and the rest of the app keeps working unchanged.
 */

const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL']

function makeApparelVariants(
  productId: number,
  handle: string,
  colors: { name: string; code: string }[],
  price: number,
  image: string,
) {
  const variants = []
  let idCounter = productId * 100
  for (const color of colors) {
    for (const size of APPAREL_SIZES) {
      idCounter += 1
      variants.push({
        id: idCounter,
        external_id: `${handle}-${color.name}-${size}`.toLowerCase().replace(/\s+/g, '-'),
        sync_product_id: productId,
        name: `${color.name} / ${size}`,
        size,
        color: color.name,
        color_code: color.code,
        retail_price: price.toFixed(2),
        currency: 'USD',
        preview_url: image,
        in_stock: !(color.name === 'Terracotta' && size === '2XL'),
      })
    }
  }
  return variants
}

export const MOCK_PRODUCTS: PrintfulSyncProduct[] = [
  {
    id: 1,
    external_id: 'masidy-essential-tee',
    name: 'Essential Heavyweight Tee',
    handle: 'essential-tee',
    thumbnail_url: '/products/essential-tee.png',
    category: 'apparel',
    description:
      'A garment-dyed 100% organic cotton tee with a relaxed, everyday fit. Pre-shrunk, ring-spun, and built to soften with every wash. Printed to order so nothing goes to waste.',
    tags: ['t-shirts', 'bestseller', 'apparel', 'new'],
    gallery: ['/products/essential-tee.png'],
    createdAt: '2025-01-04T10:00:00Z',
    variants: makeApparelVariants(
      1,
      'essential-tee',
      [
        { name: 'Heather Grey', code: '#b9b6b0' },
        { name: 'Bone', code: '#e7e2d8' },
        { name: 'Black', code: '#1c1b19' },
      ],
      32,
      '/products/essential-tee.png',
    ),
  },
  {
    id: 2,
    external_id: 'masidy-heavyweight-hoodie',
    name: 'Heavyweight Pullover Hoodie',
    handle: 'heavyweight-hoodie',
    thumbnail_url: '/products/heavyweight-hoodie.png',
    category: 'apparel',
    description:
      'A 450gsm brushed-fleece hoodie with a double-lined hood and roomy kangaroo pocket. The kind of weight you feel the moment you put it on.',
    tags: ['hoodies', 'bestseller', 'apparel'],
    gallery: ['/products/heavyweight-hoodie.png'],
    createdAt: '2025-02-11T10:00:00Z',
    variants: makeApparelVariants(
      2,
      'heavyweight-hoodie',
      [
        { name: 'Sand', code: '#cdbfa6' },
        { name: 'Black', code: '#1c1b19' },
      ],
      68,
      '/products/heavyweight-hoodie.png',
    ),
  },
  {
    id: 3,
    external_id: 'masidy-crewneck',
    name: 'Studio Crewneck Sweatshirt',
    handle: 'studio-crewneck',
    thumbnail_url: '/products/crewneck.png',
    category: 'apparel',
    description:
      'A midweight loopback crewneck with ribbed cuffs and a clean dropped shoulder. Warm, structured, and endlessly layerable.',
    tags: ['sweatshirts', 'apparel', 'new'],
    gallery: ['/products/crewneck.png'],
    createdAt: '2025-03-02T10:00:00Z',
    variants: makeApparelVariants(
      3,
      'studio-crewneck',
      [
        { name: 'Terracotta', code: '#b5623f' },
        { name: 'Bone', code: '#e7e2d8' },
      ],
      58,
      '/products/crewneck.png',
    ),
  },
  {
    id: 4,
    external_id: 'masidy-canvas-tote',
    name: 'Everyday Canvas Tote',
    handle: 'canvas-tote',
    thumbnail_url: '/products/canvas-tote.png',
    category: 'accessories',
    description:
      'A 100% heavy cotton canvas tote with reinforced handles and a generous interior. Carries groceries, laptops, and everything in between.',
    tags: ['bags', 'accessories', 'bestseller'],
    gallery: ['/products/canvas-tote.png'],
    createdAt: '2025-01-20T10:00:00Z',
    variants: [
      {
        id: 401,
        external_id: 'canvas-tote-natural-os',
        sync_product_id: 4,
        name: 'Natural / One Size',
        size: 'One Size',
        color: 'Natural',
        color_code: '#ded3bb',
        retail_price: '24.00',
        currency: 'USD',
        preview_url: '/products/canvas-tote.png',
        in_stock: true,
      },
    ],
  },
  {
    id: 5,
    external_id: 'masidy-ceramic-mug',
    name: 'Matte Ceramic Mug',
    handle: 'ceramic-mug',
    thumbnail_url: '/products/ceramic-mug.png',
    category: 'accessories',
    description:
      'An 11oz matte-glazed ceramic mug that keeps coffee hot and looks good doing it. Dishwasher and microwave safe.',
    tags: ['drinkware', 'accessories', 'new'],
    gallery: ['/products/ceramic-mug.png'],
    createdAt: '2025-02-28T10:00:00Z',
    variants: [
      {
        id: 501,
        external_id: 'ceramic-mug-bone-11',
        sync_product_id: 5,
        name: 'Bone / 11oz',
        size: '11oz',
        color: 'Bone',
        color_code: '#e7e2d8',
        retail_price: '18.00',
        currency: 'USD',
        preview_url: '/products/ceramic-mug.png',
        in_stock: true,
      },
      {
        id: 502,
        external_id: 'ceramic-mug-bone-15',
        sync_product_id: 5,
        name: 'Bone / 15oz',
        size: '15oz',
        color: 'Bone',
        color_code: '#e7e2d8',
        retail_price: '22.00',
        currency: 'USD',
        preview_url: '/products/ceramic-mug.png',
        in_stock: true,
      },
    ],
  },
  {
    id: 6,
    external_id: 'masidy-dad-cap',
    name: 'Unstructured Dad Cap',
    handle: 'dad-cap',
    thumbnail_url: '/products/dad-cap.png',
    category: 'accessories',
    description:
      'A low-profile, unstructured six-panel cap in soft washed cotton twill with an adjustable strap back. One size, fits most.',
    tags: ['hats', 'accessories'],
    gallery: ['/products/dad-cap.png'],
    createdAt: '2025-03-14T10:00:00Z',
    variants: [
      {
        id: 601,
        external_id: 'dad-cap-olive-os',
        sync_product_id: 6,
        name: 'Olive / One Size',
        size: 'One Size',
        color: 'Olive',
        color_code: '#6b6b45',
        retail_price: '28.00',
        currency: 'USD',
        preview_url: '/products/dad-cap.png',
        in_stock: true,
      },
    ],
  },
  {
    id: 7,
    external_id: 'masidy-ribbed-beanie',
    name: 'Ribbed Knit Beanie',
    handle: 'ribbed-beanie',
    thumbnail_url: '/products/ribbed-beanie.png',
    category: 'accessories',
    description:
      'A tight ribbed-knit beanie with a fold-over cuff. Warm without the bulk, and cut to sit clean on the head.',
    tags: ['hats', 'accessories', 'new'],
    gallery: ['/products/ribbed-beanie.png'],
    createdAt: '2025-03-20T10:00:00Z',
    variants: [
      {
        id: 701,
        external_id: 'ribbed-beanie-charcoal-os',
        sync_product_id: 7,
        name: 'Charcoal / One Size',
        size: 'One Size',
        color: 'Charcoal',
        color_code: '#3a3a38',
        retail_price: '26.00',
        currency: 'USD',
        preview_url: '/products/ribbed-beanie.png',
        in_stock: true,
      },
    ],
  },
  {
    id: 8,
    external_id: 'masidy-studio-print',
    name: 'Studio Art Print',
    handle: 'studio-print',
    thumbnail_url: '/products/studio-print.png',
    category: 'prints',
    description:
      'A giclée art print on heavyweight matte archival paper. Warm earth-tone composition designed in-studio. Frame not included.',
    tags: ['prints', 'wall-art', 'new'],
    gallery: ['/products/studio-print.png'],
    createdAt: '2025-03-25T10:00:00Z',
    variants: [
      {
        id: 801,
        external_id: 'studio-print-a3',
        sync_product_id: 8,
        name: 'A3 (11.7 x 16.5in)',
        size: 'A3',
        color: 'Earth',
        color_code: '#b5623f',
        retail_price: '34.00',
        currency: 'USD',
        preview_url: '/products/studio-print.png',
        in_stock: true,
      },
      {
        id: 802,
        external_id: 'studio-print-a2',
        sync_product_id: 8,
        name: 'A2 (16.5 x 23.4in)',
        size: 'A2',
        color: 'Earth',
        color_code: '#b5623f',
        retail_price: '48.00',
        currency: 'USD',
        preview_url: '/products/studio-print.png',
        in_stock: true,
      },
    ],
  },
]

export const MOCK_COLLECTIONS: Collection[] = [
  {
    handle: 'all',
    title: 'All Products',
    description: 'Everything in the Masidy catalog, printed to order.',
  },
  {
    handle: 'apparel',
    title: 'Apparel',
    description: 'Heavyweight tees, hoodies, and crewnecks built to last.',
  },
  {
    handle: 'accessories',
    title: 'Accessories',
    description: 'Totes, mugs, caps, and the small things that finish a look.',
  },
  {
    handle: 'prints',
    title: 'Prints',
    description: 'Studio-designed wall art on archival paper.',
  },
]
