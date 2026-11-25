'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import type { Product } from '@/lib/products/types'

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadProducts()
  }, [])

  async function loadProducts() {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/products')
      if (!response.ok) throw new Error('Failed to load products.')
      const data = (await response.json()) as { products: Product[] }
      setProducts(data.products)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load products.')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8">
        <p className="text-center text-muted-foreground">Loading products...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Products</h1>
        <button
          onClick={loadProducts}
          className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary"
        >
          <RefreshCw className="size-4" />
          Refresh
        </button>
      </div>

      {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <div key={product.id} className="rounded-lg border border-border p-4">
            {product.featuredImage && <img src={product.featuredImage} alt={product.title} className="mb-4 h-40 w-full rounded object-cover" />}
            <h3 className="font-semibold">{product.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{product.variants.length} variants</p>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-sm font-semibold">
                ${product.priceRange.min.toFixed(2)} - ${product.priceRange.max.toFixed(2)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
