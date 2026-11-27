import Link from 'next/link'

export default function ResellerDashboardDemoPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <p className="rounded-md border border-accent/30 bg-secondary/30 p-4 text-sm">
        Demo only — visits, links, and earnings are examples. The referral link is inactive and no payment or attribution will be created.
      </p>
      <div className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Reseller preview</p>
          <h1 className="mt-2 text-3xl font-bold">Reseller dashboard</h1>
          <p className="mt-2 text-muted-foreground">A sample view of referral links and performance.</p>
        </div>
        <Link href="/marketplace/demo" className="text-sm font-semibold text-accent underline underline-offset-4">All dashboard previews</Link>
      </div>

      <section className="mt-8 rounded-lg border border-border p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Your sample referral link</h2>
        <p className="mt-1 text-sm text-muted-foreground">Share an approved product page. Eligible visits are attributed for up to 30 days.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            readOnly
            aria-label="Inactive example referral link"
            value="https://www.masidy.store/r/DEMO-CODE?to=%2Fmarketplace"
            className="min-h-11 min-w-0 flex-1 rounded-md border border-border bg-secondary/20 px-3 text-sm"
          />
          <button type="button" disabled className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold opacity-60">
            Copy link (preview)
          </button>
        </div>
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2">
        <Stat label="All-time referral visits" value="286" />
        <Stat label="Visits in the last 30 days" value="74" />
      </section>

      <section className="mt-6 rounded-lg border border-border p-5 sm:p-6">
        <h2 className="text-lg font-semibold">Sample earnings</h2>
        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <p>Attributed orders <strong className="block text-lg">8</strong></p>
          <p>Pending after delivery hold <strong className="block text-lg">€14.20</strong></p>
          <p>Previously paid <strong className="block text-lg">€42.80</strong></p>
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Real marketplace shares are calculated from net transaction contribution and become payable only after delivery verification and the 30-day hold.
        </p>
      </section>

      <p className="mt-8 text-sm text-muted-foreground">
        Want your own dashboard? <Link href="/login?redirect=%2Faccount" className="font-semibold text-accent underline underline-offset-4">Sign in and apply for reseller access</Link>.
      </p>
    </main>
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
