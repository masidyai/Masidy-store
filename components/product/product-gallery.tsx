'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { Product } from '@/lib/products/types'

export function ProductGallery({ product }: { product: Product }) {
  const [selectedImage, setSelectedImage] = useState(product.featuredImage)

  // Listen to custom event from ProductDetails when variant changes
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      const variantImage = e.detail?.image
      if (variantImage) {
        setSelectedImage(variantImage)
      }
    }

    window.addEventListener('variant-changed' as any, handler as any)
    return () => window.removeEventListener('variant-changed' as any, handler as any)
  }, [])

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      <div className="relative aspect-square overflow-hidden rounded-lg border border-border bg-card">
        <Image
          src={selectedImage || '/placeholder.svg'}
          alt={product.title}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          className="object-cover"
          key={selectedImage} // Force re-render when image changes
        />
      </div>
      {product.images.length > 1 && (
        <div className="grid grid-cols-4 gap-2 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
          {product.images.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSelectedImage(img)}
              className={`relative aspect-square overflow-hidden rounded-md border-2 bg-card transition-all hover:opacity-80 ${
                selectedImage === img ? 'border-primary ring-2 ring-primary ring-offset-2' : 'border-border'
              }`}
            >
              <Image
                src={img || '/placeholder.svg'}
                alt={`${product.title} view ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
