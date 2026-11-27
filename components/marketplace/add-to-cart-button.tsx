'use client'

import { useState } from 'react'
import { Check, Plus } from 'lucide-react'
import { useMarketplaceCart } from '@/components/marketplace/cart-provider'
import type { PublicSellerListing } from '@/lib/marketplace/db'

export function AddToMarketplaceCartButton({ listing }: { listing: PublicSellerListing }) {
  const { addItem } = useMarketplaceCart()
  const [added, setAdded] = useState(false)
  const [error, setError] = useState('')

  function add() {
    setError('')
    const success = addItem({
      listingId: listing.id,
      title: listing.title,
      imageUrl: listing.imageUrl,
      category: listing.category,
      priceMinor: listing.priceMinor,
      currency: listing.currency,
    })
    if (!success) {
      setError('Your marketplace bag contains a different currency. Finish that order first.')
      return
    }
    setAdded(true)
    window.setTimeout(() => setAdded(false), 1800)
  }

  return (
    <div>
      <button
        type="button"
        onClick={add}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-accent px-5 font-semibold text-accent-foreground hover:bg-accent/90"
      >
        {added ? <><Check className="size-4" /> Added</> : <><Plus className="size-4" /> Add to marketplace bag</>}
      </button>
      {error && <p role="alert" className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  )
}
