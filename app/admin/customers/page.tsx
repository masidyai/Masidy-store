'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function AdminCustomersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <Link href="/admin" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" />
        Back to Dashboard
      </Link>

      <h1 className="mb-8 text-3xl font-bold">Customers</h1>
      <div className="rounded-lg border border-border bg-secondary/40 p-8 text-center">
        <p className="text-muted-foreground">Customer management coming soon</p>
      </div>
    </div>
  )
}
