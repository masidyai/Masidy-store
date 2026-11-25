'use client'

import { useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Product } from '@/lib/products/types'
import { ProductCard } from '@/components/product/product-card'

export function ProductCarousel({
  title,
  products,
}: {
  title: string
  products: Product[]
}) {
  const scroller = useRef<HTMLDivElement>(null)

  function scrollBy(dir: 1 | -1) {
    const el = scroller.current
    if (!el) return
    el.scrollBy({ left: dir * (el.clientWidth * 0.8), behavior: 'smooth' })
  }

  if (products.length === 0) return null

  return (
    <section className="mx-auto max-w-7xl px-3 sm:px-4 md:px-6">
      <div className="mb-3 flex items-end justify-between sm:mb-4 md:mb-5">
        <h2 className="font-serif text-lg font-semibold tracking-tight sm:text-xl md:text-2xl lg:text-3xl">{title}</h2>
        <div className="hidden gap-2 md:flex">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
            aria-label="Scroll left"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground transition-colors hover:bg-muted"
            aria-label="Scroll right"
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>
      <div
        ref={scroller}
        className="flex snap-x snap-mandatory gap-2.5 overflow-x-auto pb-2 [scrollbar-width:none] sm:gap-3 md:gap-4 [&::-webkit-scrollbar]:hidden"
      >
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[42%] shrink-0 snap-start sm:w-[46%] md:w-[31%] lg:w-[23%]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  )
}
