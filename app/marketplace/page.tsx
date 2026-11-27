import Link from 'next/link'
import Image from 'next/image'
import { getPublicMarketplaceListings } from '@/lib/marketplace/db'
import { fromMinorUnits } from '@/lib/checkout/money'
import { formatPrice } from '@/lib/products/format'

export const dynamic = 'force-dynamic'

export default async function MarketplacePage() {
  const listings = await getPublicMarketplaceListings()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Independent sellers</p>
          <h1 className="mt-2 text-3xl font-bold md:text-4xl">Masidy Marketplace</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Discover products from sellers reviewed by Masidy. Each seller prepares and ships their own orders.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">Prices include applicable tax where required; shipping is calculated for your destination.</p>
        </div>
        <Link href="/marketplace/cart" className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-semibold hover:bg-secondary/40">
          View marketplace bag
        </Link>
      </div>

      {listings.length === 0 ? (
        <div className="mt-12 rounded-lg border border-border p-8 text-center">
          <h2 className="text-xl font-semibold">More products are on the way</h2>
          <p className="mt-2 text-sm text-muted-foreground">Approved independent-seller products will appear here.</p>
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
          {listings.map((listing) => (
            <li key={listing.id}>
              <Link href={`/marketplace/${encodeURIComponent(listing.id)}`} className="group block">
                <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-secondary/30">
                  <Image
                    src={listing.imageUrl}
                    alt={listing.title}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    unoptimized
                  />
                </div>
                <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">{listing.category}</p>
                <h2 className="mt-1 line-clamp-2 text-sm font-medium">{listing.title}</h2>
                <p className="mt-1 text-sm font-semibold">
                  {formatPrice(fromMinorUnits(listing.priceMinor, listing.currency), listing.currency)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Sold by {listing.sellerName}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
