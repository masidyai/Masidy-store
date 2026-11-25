import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Hero } from '@/components/home/hero'
import { FeaturedGrid } from '@/components/home/featured-grid'
import { ProductCarousel } from '@/components/home/product-carousel'
import { getFeaturedProducts, getProducts } from '@/lib/products/api'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [featured, latest, all] = await Promise.all([
    getFeaturedProducts(3),
    getProducts({ sort: 'latest' }),
    getProducts(),
  ])

  return (
    <div className="flex flex-col gap-8 pb-6 sm:gap-10 sm:pb-8 md:gap-14 md:pb-10 lg:gap-20">
      <Hero />

      <FeaturedGrid products={featured} />

      <ProductCarousel title="New this season" products={latest.slice(0, 8)} />

      {/* Values band */}
      <section className="border-y border-border bg-secondary/40">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:gap-8 sm:py-10 md:grid-cols-3 md:px-6 md:py-12 lg:py-14">
          {[
            {
              title: 'Premium Quality',
              body: 'Carefully crafted with heavyweight organic cottons and archival materials built to last.',
            },
            {
              title: 'Thoughtful Design',
              body: 'Masidy products in warm, considered tones designed for everyday wear and timeless style.',
            },
            {
              title: 'Fast Shipping',
              body: 'Quick fulfillment and delivery so you get your Masidy essentials when you need them.',
            },
          ].map((item) => (
            <div key={item.title}>
              <h3 className="font-serif text-lg font-semibold sm:text-xl">{item.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground sm:mt-2 sm:text-sm">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <ProductCarousel title="The full catalog" products={all} />

      {/* Closing CTA */}
      <section className="mx-auto w-full max-w-7xl px-4 md:px-6">
        <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-primary px-6 py-8 text-primary-foreground sm:gap-5 sm:px-8 sm:py-10 md:items-center md:px-12 md:py-14 md:text-center lg:py-16">
          <h2 className="max-w-2xl text-balance font-serif text-xl font-semibold leading-tight sm:text-2xl md:text-3xl lg:text-4xl">
            Find your everyday essentials.
          </h2>
          <p className="max-w-md text-pretty text-xs leading-relaxed text-primary-foreground/70 sm:text-sm">
            Browse the full Masidy catalog — apparel and accessories for everyday wear.
          </p>
          <Link
            href="/search"
            className="group inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-xs font-semibold text-accent-foreground transition-colors hover:bg-accent/90 sm:px-6 sm:py-3 sm:text-sm"
          >
            Shop everything
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 sm:size-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}
