'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, LogOut, Settings, ShoppingBag } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { MarketplacePrograms } from '@/components/account/marketplace-programs'

interface User {
  id: string
  email: string
  name?: string
}

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      const response = await fetch('/api/auth/me')
      if (!response.ok) {
        router.push('/')
        return
      }
      const data = await response.json()
      setUser(data.user)
      setLoading(false)
    }

    loadUser()
  }, [router])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <p className="text-center text-muted-foreground">Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">My Account</h1>
        <p className="mt-2 text-muted-foreground">Welcome back, {user.name || user.email.split('@')[0]}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Profile Card */}
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Profile</h2>
            <Link
              href="/account/settings"
              className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-accent"
              aria-label="Account settings"
              title="Edit profile"
            >
              <Settings className="size-5" />
            </Link>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="mt-1 font-semibold">{user.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="mt-1 font-semibold">{user.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">{user.id.slice(0, 16)}...</p>
            </div>
          </div>
        </div>

        {/* Orders Card */}
        <Link
          href="/account/orders"
          className="flex flex-col rounded-lg border border-border bg-background p-6 transition-colors hover:bg-secondary/40"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Orders</h2>
            <ShoppingBag className="size-5 text-muted-foreground" />
          </div>
          <p className="flex-1 text-sm text-muted-foreground">View your order history and track shipments</p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent hover:text-accent/80">
            View Orders
            <ArrowRight className="size-4" />
          </div>
        </Link>

        {/* Quick Actions Card */}
        <div className="rounded-lg border border-border bg-background p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="space-y-3">
            <Link
              href="/search"
              className="flex items-center justify-between rounded-md border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
            >
              Continue Shopping
              <ArrowRight className="size-4" />
            </Link>
            <button
              onClick={signOut}
              className="flex w-full items-center justify-between rounded-md border border-border px-4 py-3 text-sm font-medium transition-colors hover:bg-secondary"
            >
              <span className="flex items-center gap-2">
                <LogOut className="size-4" />
                Sign out
              </span>
            </button>
          </div>
        </div>
      </div>

      <MarketplacePrograms />

      {/* Additional Info Section */}
      <div className="mt-8 rounded-lg border border-border bg-secondary/20 p-6">
        <h3 className="mb-4 text-lg font-semibold">Need Help?</h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/shipping" className="text-sm text-muted-foreground hover:text-accent">
            Shipping Info
          </Link>
          <Link href="/returns" className="text-sm text-muted-foreground hover:text-accent">
            Returns & Exchanges
          </Link>
          <Link href="/faq" className="text-sm text-muted-foreground hover:text-accent">
            FAQ
          </Link>
          <Link href="/contact" className="text-sm text-muted-foreground hover:text-accent">
            Contact Us
          </Link>
        </div>
      </div>
    </div>
  )
}
