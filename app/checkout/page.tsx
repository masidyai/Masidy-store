'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { formatPrice } from '@/lib/products/format'

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, currency, clear } = useCart()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Form state
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [country, setCountry] = useState('US')
  const [phone, setPhone] = useState('')

  useEffect(() => {
    async function loadUser() {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
        setEmail(data.user.email)
        setName(data.user.name || '')
      }
    }
    loadUser()
  }, [])

  // Redirect if cart is empty
  useEffect(() => {
    if (items.length === 0) {
      router.push('/search')
    }
  }, [items, router])

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Your cart is empty</p>
      </div>
    )
  }

  const shippingCost = subtotal > 100 ? 0 : 10
  const tax = Math.round(subtotal * 0.1 * 100) / 100
  const total = subtotal + shippingCost + tax

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Validation
    if (!email || !name || !address1 || !city || !state || !zip || !country) {
      setError('Please fill in all required fields')
      setLoading(false)
      return
    }

    try {
      const shippingAddress = {
        name,
        email,
        address1,
        address2,
        city,
        state,
        zip,
        country,
        phone,
      }

      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, email, shippingAddress }),
      })

      const data = await res.json()

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url
      } else {
        setError(data.message || 'Checkout failed. Please try again.')
        setLoading(false)
      }
    } catch (err) {
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      <Link
        href="/search"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-accent"
      >
        <ArrowLeft className="size-4" />
        Continue Shopping
      </Link>

      <h1 className="mb-8 text-3xl font-bold">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Checkout Form */}
        <div>
          <form onSubmit={handleCheckout} className="space-y-6">
            {/* Contact Information */}
            <div>
              <h2 className="mb-4 text-xl font-semibold">Contact Information</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="mb-2 block text-sm font-medium">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    disabled={!!user}
                    className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    We'll send your order confirmation here
                  </p>
                </div>
              </div>
            </div>

            {/* Shipping Address */}
            <div>
              <h2 className="mb-4 text-xl font-semibold">Shipping Address</h2>
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="mb-2 block text-sm font-medium">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label htmlFor="address1" className="mb-2 block text-sm font-medium">
                    Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="address1"
                    type="text"
                    value={address1}
                    onChange={(e) => setAddress1(e.target.value)}
                    placeholder="123 Main St"
                    required
                    className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div>
                  <label htmlFor="address2" className="mb-2 block text-sm font-medium">
                    Apartment, suite, etc. (optional)
                  </label>
                  <input
                    id="address2"
                    type="text"
                    value={address2}
                    onChange={(e) => setAddress2(e.target.value)}
                    placeholder="Apt 4B"
                    className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="city" className="mb-2 block text-sm font-medium">
                      City <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="New York"
                      required
                      className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="state" className="mb-2 block text-sm font-medium">
                      State/Province <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="state"
                      type="text"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="NY"
                      required
                      className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="zip" className="mb-2 block text-sm font-medium">
                      ZIP/Postal Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="zip"
                      type="text"
                      value={zip}
                      onChange={(e) => setZip(e.target.value)}
                      placeholder="10001"
                      required
                      className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>

                  <div>
                    <label htmlFor="country" className="mb-2 block text-sm font-medium">
                      Country <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="country"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                      required
                      className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                      <option value="GB">United Kingdom</option>
                      <option value="AU">Australia</option>
                      <option value="DE">Germany</option>
                      <option value="FR">France</option>
                      <option value="ES">Spain</option>
                      <option value="IT">Italy</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="mb-2 block text-sm font-medium">
                    Phone (optional)
                  </label>
                  <input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                    className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-accent py-3.5 font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Lock className="size-5" />
                  Continue to Payment
                </>
              )}
            </button>

            <p className="text-center text-xs text-muted-foreground">
              Secure checkout powered by Stripe
            </p>
          </form>
        </div>

        {/* Order Summary */}
        <div>
          <div className="rounded-lg border border-border bg-secondary/20 p-6">
            <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>

            <div className="mb-4 space-y-3">
              {items.map((item) => (
                <div key={item.variantId} className="flex gap-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded border border-border">
                    <Image
                      src={item.image || '/placeholder.svg'}
                      alt={item.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.color} / {item.size}
                    </p>
                    <p className="mt-1 text-sm">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatPrice(item.price * item.quantity, currency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost, currency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estimated Tax</span>
                <span>{formatPrice(tax, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold">
                <span>Total</span>
                <span>{formatPrice(total, currency)}</span>
              </div>
            </div>

            {subtotal < 100 && (
              <p className="mt-4 text-xs text-muted-foreground">
                Add {formatPrice(100 - subtotal, currency)} more for free shipping!
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
