import Link from 'next/link'

const sampleListings = [
  { title: 'Weekend Canvas Tote', category: 'Accessories', price: '€32.00', status: 'Under review' },
  { title: 'Everyday Cotton Tee', category: 'Apparel', price: '€28.00', status: 'Draft' },
]

export default function SellerDashboardDemoPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <DemoNotice />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Seller preview</p>
          <h1 className="mt-2 text-3xl font-bold">Seller dashboard</h1>
          <p className="mt-2 text-muted-foreground">A sample view of listing and order-management tools.</p>
        </div>
        <Link href="/marketplace/demo" className="text-sm font-semibold text-accent underline underline-offset-4">All dashboard previews</Link>
      </div>

      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Product drafts" value="2" />
        <Stat label="Orders to fulfill" value="1" />
        <Stat label="Available payouts" value="€0.00" />
      </section>

      <section className="mt-8 rounded-lg border border-border p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Your listings</h2>
            <p className="mt-1 text-sm text-muted-foreground">Create a draft, then submit it for review.</p>
          </div>
          <button type="button" disabled className="min-h-10 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground opacity-60">
            Add product (preview)
          </button>
        </div>
        <ul className="mt-5 divide-y divide-border">
          {sampleListings.map((listing) => (
            <li key={listing.title} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-semibold">{listing.title}</p>
                <p className="text-sm text-muted-foreground">{listing.category} · {listing.price}</p>
              </div>
              <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">{listing.status}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-border p-5 sm:p-6">
        <h2 className="text-xl font-semibold">Sample customer order</h2>
        <div className="mt-4 flex flex-wrap justify-between gap-3">
          <div>
            <p className="font-medium">Weekend Canvas Tote × 1</p>
            <p className="mt-1 text-sm text-muted-foreground">Order MKT-1042 · Tracking submitted</p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="font-semibold">Illustrative seller amount: €27.36</p>
            <p className="text-muted-foreground">Payout follows delivery verification and the 30-day hold.</p>
          </div>
        </div>
      </section>

      <ApplyLink />
    </main>
  )
}

function DemoNotice() {
  return (
    <p className="rounded-md border border-accent/30 bg-secondary/30 p-4 text-sm">
      Demo only — all products, orders, and amounts below are examples. Actions are disabled and nothing is saved.
    </p>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  )
}

function ApplyLink() {
  return (
    <p className="mt-8 text-sm text-muted-foreground">
      Want your own dashboard? <Link href="/login?redirect=%2Faccount" className="font-semibold text-accent underline underline-offset-4">Sign in and apply for seller access</Link>.
    </p>
  )
}
