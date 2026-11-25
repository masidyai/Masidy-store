'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/lib/cart-context'

const LINKS = [
  { href: '/search', label: 'Shop All' },
  { href: '/search/apparel', label: 'Apparel' },
  { href: '/search/accessories', label: 'Accessories' },
]

export function Navbar() {
  const { totalQuantity, openCart } = useCart()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [user, setUser] = useState<{ email: string; name?: string | null } | null>(null)
  const pathname = usePathname()

  useEffect(() => {
    async function loadUser() {
      const response = await fetch('/api/auth/me')
      if (!response.ok) return
      const data = await response.json()
      setUser(data.user)
    }

    loadUser()
  }, [])

  async function signOut() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setUser(null)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <nav
        className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6"
        aria-label="Primary"
      >
        {/* Left: mobile toggle + desktop links */}
        <div className="flex flex-1 items-center gap-1">
          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className="-ml-1 inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-muted md:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
          <ul className="hidden items-center gap-6 md:flex">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={cn(
                    'text-sm tracking-wide text-muted-foreground transition-colors hover:text-foreground',
                    pathname === link.href && 'text-foreground',
                  )}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Center: logo */}
        <Link
          href="/"
          className="flex items-center"
          aria-label="Masidy home"
        >
          <Image
            src="/masidy-wordmark-light.png"
            alt="Masidy"
            width={450}
            height={120}
            className="h-7 w-auto dark:hidden md:h-8"
            priority
          />
          <Image
            src="/masidy-wordmark-dark.png"
            alt=""
            width={450}
            height={120}
            className="hidden h-7 w-auto dark:block md:h-8"
            priority
          />
        </Link>

        {/* Right: search + cart */}
        <div className="flex flex-1 items-center justify-end gap-1">
          <Link
            href="/search"
            className="inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
            aria-label="Search products"
          >
            <Search className="size-5" />
          </Link>
          <button
            type="button"
            onClick={openCart}
            className="relative inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
            aria-label={`Open cart, ${totalQuantity} items`}
          >
            <ShoppingBag className="size-5" />
            {totalQuantity > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                {totalQuantity}
              </span>
            )}
          </button>
          {user ? (
            <div className="flex items-center gap-2">
              <Link
                href="/account"
                className="inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
                aria-label="My Account"
                title="My Account"
              >
                <UserRound className="size-5" />
              </Link>
              <button
                type="button"
                onClick={signOut}
                className="hidden items-center rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted md:inline-flex"
              >
                Sign out
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex size-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
              aria-label="Sign in"
            >
              <UserRound className="size-5" />
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-border bg-background md:hidden">
          <ul className="flex flex-col px-4 py-2">
            {LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 text-base text-foreground"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  )
}
