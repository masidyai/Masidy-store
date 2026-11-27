import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { AddToMarketplaceCartButton } from '@/components/marketplace/add-to-cart-button'
import { getPublicMarketplaceListing } from '@/lib/marketplace/db'
import { fromMinorUnits } from '@/lib/checkout/money'
import { formatPrice } from '@/lib/products/format'

interface MarketplaceListingPageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function MarketplaceListingPage({ params }: MarketplaceListingPageProps) {
  const { id } = await params
  const listing = await getPublicMarketplaceListing(id)
  if (!listing) notFound()

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 md:px-6 md:py-10">
      <Link href="/marketplace" className="text-sm text-muted-foreground hover:text-foreground">← Marketplace</Link>
      <div className="mt-5 grid gap-8 md:grid-cols-2 md:gap-12">
        <div className="relative aspect-square overflow-hidden rounded-lg bg-secondary/30">
          <Image src={listing.imageUrl} alt={listing.title} fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" unoptimized priority />
        </div>
        <section className="md:py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">{listing.category}</p>
          <h1 className="mt-3 text-3xl font-bold md:text-4xl">{listing.title}</h1>
          <p className="mt-4 text-2xl font-semibold">
            {formatPrice(fromMinorUnits(listing.priceMinor, listing.currency), listing.currency)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Sold and shipped by {listing.sellerName}</p>
          <p className="mt-6 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{listing.description}</p>
          <p className="mt-6 text-sm text-muted-foreground">
            The listed price includes applicable tax where required. Shipping is calculated by destination, and the final tax breakdown is shown at checkout.
          </p>
          <div className="mt-7">
            <AddToMarketplaceCartButton listing={listing} />
          </div>
        </section>
      </div>
    </main>
  )
}
