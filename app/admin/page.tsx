'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BarChart3, Package, ShoppingCart, Users } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface DashboardStats {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  pendingOrders: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      // Check if user is authenticated and is admin
      const userRes = await fetch('/api/auth/me')
      if (!userRes.ok) {
        setError('Please sign in to access the admin dashboard')
        setTimeout(() => router.push('/account'), 2000)
        return
      }

      const userData = await userRes.json()
      setUser(userData.user)

      // Check admin status
      if (!userData.user.isAdmin) {
        setError('You do not have admin access')
        setTimeout(() => router.push('/account'), 2000)
        return
      }

      // Load stats
      const statsRes = await fetch('/api/admin/stats')
      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }

      setLoading(false)
    }

    load()
  }, [router])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <p className="text-center text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
        <div className="rounded-lg border border-red-300 bg-red-50 p-6 text-center">
          <p className="text-red-700">{error}</p>
          <p className="mt-2 text-sm text-red-600">Redirecting...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="mt-2 text-muted-foreground">Manage your store</p>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-border bg-background p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="mt-2 text-2xl font-bold">USD {stats.totalRevenue.toFixed(2)}</p>
              </div>
              <BarChart3 className="size-8 text-muted-foreground" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="mt-2 text-2xl font-bold">{stats.totalOrders}</p>
              </div>
              <ShoppingCart className="size-8 text-muted-foreground" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Customers</p>
                <p className="mt-2 text-2xl font-bold">{stats.totalCustomers}</p>
              </div>
              <Users className="size-8 text-muted-foreground" />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-background p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="mt-2 text-2xl font-bold">{stats.pendingOrders}</p>
              </div>
              <Package className="size-8 text-muted-foreground" />
            </div>
          </div>
        </div>
      )}

      {/* Management Links */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/admin/orders"
          className="rounded-lg border border-border bg-background p-6 transition-colors hover:bg-secondary/40"
        >
          <ShoppingCart className="mb-4 size-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Orders</h3>
          <p className="mt-2 text-sm text-muted-foreground">View and manage all orders</p>
        </Link>

        <Link
          href="/admin/products"
          className="rounded-lg border border-border bg-background p-6 transition-colors hover:bg-secondary/40"
        >
          <Package className="mb-4 size-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Products</h3>
          <p className="mt-2 text-sm text-muted-foreground">Sync and manage products</p>
        </Link>

        <Link
          href="/admin/customers"
          className="rounded-lg border border-border bg-background p-6 transition-colors hover:bg-secondary/40"
        >
          <Users className="mb-4 size-8 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Customers</h3>
          <p className="mt-2 text-sm text-muted-foreground">View customer information</p>
        </Link>
      </div>
    </div>
  )
}
