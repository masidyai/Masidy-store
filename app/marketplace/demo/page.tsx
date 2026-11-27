import Link from 'next/link'

export default function MarketplaceDemoPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 md:px-6 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Marketplace preview</p>
      <h1 className="mt-2 text-3xl font-bold md:text-4xl">Explore the dashboards</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        See how seller and reseller tools work using sample information. Previews are read-only and do not touch real accounts or payments.
      </p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <DemoCard
          title="Seller dashboard"
          description="Preview listing drafts, order fulfillment, tracking, and payout status."
          href="/marketplace/demo/seller"
        />
        <DemoCard
          title="Reseller dashboard"
          description="Preview share links, visit reporting, and sample earnings."
          href="/marketplace/demo/reseller"
        />
      </div>
      <Link href="/login?redirect=%2Faccount" className="mt-8 inline-flex text-sm font-semibold text-accent underline underline-offset-4">
        Sign in to apply for a program
      </Link>
    </main>
  )
}

function DemoCard({
  title,
  description,
  href,
}: {
  title: string
  description: string
  href: string
}) {
  return (
    <Link href={href} className="rounded-lg border border-border p-5 transition-colors hover:bg-secondary/30">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <span className="mt-5 inline-flex font-semibold text-accent">Open preview →</span>
    </Link>
  )
}
