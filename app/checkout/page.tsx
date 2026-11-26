'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'
import { useCart } from '@/lib/cart-context'
import { PRINTFUL_SHIPPING_COUNTRIES } from '@/lib/checkout/shipping-countries'
import { fromMinorUnits, toMinorUnits } from '@/lib/checkout/money'
import type { CheckoutAddress } from '@/lib/checkout/printful'
import { formatPrice } from '@/lib/products/format'

interface CheckoutRate {
  id: string
  name: string
  amountCents: number
  currency: string
  minDeliveryDays?: number
  maxDeliveryDays?: number
  taxCents: number
  totalCents: number
}

interface CheckoutQuote {
  currency: string
  subtotalCents: number
  items: Array<{
    id: string
    title: string
    color: string
    size: string
    priceCents: number
    quantity: number
  }>
  rates: CheckoutRate[]
}

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countryOptions = PRINTFUL_SHIPPING_COUNTRIES
  .map((code) => ({ code, name: countryNames.of(code) || code }))
  .sort((a, b) => a.name.localeCompare(b.name))

export default function CheckoutPage() {
  const router = useRouter()
  const { items, subtotal, currency, clear } = useCart()
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [quote, setQuote] = useState<CheckoutQuote | null>(null)
  const [selectedRateId, setSelectedRateId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [orderId, setOrderId] = useState('')
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [paymentTotalCents, setPaymentTotalCents] = useState<number | null>(null)
  const [paymentCurrency, setPaymentCurrency] = useState('USD')

  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [address1, setAddress1] = useState('')
  const [address2, setAddress2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [zip, setZip] = useState('')
  const [country, setCountry] = useState('US')
  const [phone, setPhone] = useState('')

  const shippingAddress = useMemo<CheckoutAddress>(() => ({
    name,
    email,
    address1,
    address2,
    city,
    state,
    zip,
    country,
    phone,
  }), [name, email, address1, address2, city, state, zip, country, phone])

  useEffect(() => {
    let active = true
    async function loadCheckoutConfig() {
      try {
        const response = await fetch('/api/checkout')
        const data: unknown = await response.json()
        if (!response.ok || !isRecord(data) || typeof data.publishableKey !== 'string') {
          throw new Error(getErrorMessage(data, 'Payments are not configured.'))
        }
        if (active) setStripePromise(loadStripe(data.publishableKey))
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : 'Payments are not configured.')
        }
      }
    }

    async function loadUser() {
      try {
        const response = await fetch('/api/auth/me')
        if (!response.ok) return
        const data: unknown = await response.json()
        if (!active || !isRecord(data) || !isRecord(data.user)) return
        const accountEmail = typeof data.user.email === 'string' ? data.user.email : ''
        const accountName = typeof data.user.name === 'string' ? data.user.name : ''
        setUser({ email: accountEmail, name: accountName })
        setEmail(accountEmail)
        setName(accountName)
      } catch {
        // Guest checkout remains available when the account lookup is unavailable.
      }
    }

    void loadCheckoutConfig()
    void loadUser()
    return () => { active = false }
  }, [])

  useEffect(() => {
    setQuote(null)
    setSelectedRateId('')
    setClientSecret('')
    setOrderId('')
    setPaymentTotalCents(null)
  }, [items, shippingAddress])

  useEffect(() => {
    if (items.length === 0) router.push('/search')
  }, [items, router])

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Your cart is empty</p>
      </div>
    )
  }

  const selectedRate = quote?.rates.find((rate) => rate.id === selectedRateId)

  async function handleShippingQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/checkout/shipping-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, shippingAddress }),
      })
      const data: unknown = await response.json()
      if (!response.ok || !isCheckoutQuote(data)) {
        throw new Error(getErrorMessage(data, 'Could not calculate shipping.'))
      }
      setQuote(data)
      setSelectedRateId(data.rates[0]?.id || '')
    } catch (quoteError) {
      setError(quoteError instanceof Error ? quoteError.message : 'Could not calculate shipping.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePreparePayment() {
    if (!selectedRate || !quote) return
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          email,
          shippingAddress,
          shippingRateId: selectedRate.id,
          expectedShippingCents: selectedRate.amountCents,
          expectedTotalCents: selectedRate.totalCents,
          expectedCurrency: selectedRate.currency,
        }),
      })
      const data: unknown = await response.json()
      if (
        !response.ok ||
        !isRecord(data) ||
        typeof data.clientSecret !== 'string' ||
        typeof data.orderId !== 'string' ||
        typeof data.totalCents !== 'number' ||
        typeof data.currency !== 'string'
      ) {
        throw new Error(getErrorMessage(data, 'Could not prepare payment.'))
      }
      setClientSecret(data.clientSecret)
      setOrderId(data.orderId)
      setPaymentTotalCents(data.totalCents)
      setPaymentCurrency(data.currency)
    } catch (paymentError) {
      setError(paymentError instanceof Error ? paymentError.message : 'Could not prepare payment.')
    } finally {
      setLoading(false)
    }
  }

  const displayedItems = quote?.items ?? items.map((item) => ({
    id: item.variantId,
    title: item.title,
    color: item.color,
    size: item.size,
    priceCents: toMinorUnits(item.price, currency) ?? 0,
    quantity: item.quantity,
  }))
  const displayedCurrency = quote?.currency ?? currency
  const displayedSubtotal = quote
    ? fromMinorUnits(quote.subtotalCents, quote.currency)
    : subtotal

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
        <div>
          <form onSubmit={handleShippingQuote} className="space-y-6">
            <section>
              <h2 className="mb-4 text-xl font-semibold">Contact Information</h2>
              <label htmlFor="email" className="mb-2 block text-sm font-medium">
                Email <span className="text-red-500">*</span>
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="your@email.com"
                required
                disabled={!!user}
                className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                We&apos;ll send your order confirmation here
              </p>
            </section>

            <section>
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
                    onChange={(event) => setName(event.target.value)}
                    required
                    autoComplete="name"
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
                    onChange={(event) => setAddress1(event.target.value)}
                    required
                    autoComplete="address-line1"
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
                    onChange={(event) => setAddress2(event.target.value)}
                    autoComplete="address-line2"
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
                      onChange={(event) => setCity(event.target.value)}
                      required
                      autoComplete="address-level2"
                      className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                  <div>
                    <label htmlFor="state" className="mb-2 block text-sm font-medium">
                      State / Province (if applicable)
                    </label>
                    <input
                      id="state"
                      type="text"
                      value={state}
                      onChange={(event) => setState(event.target.value)}
                      placeholder="e.g. NY"
                      autoComplete="address-level1"
                      className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="zip" className="mb-2 block text-sm font-medium">
                      ZIP / Postal Code
                    </label>
                    <input
                      id="zip"
                      type="text"
                      value={zip}
                      onChange={(event) => setZip(event.target.value)}
                      autoComplete="postal-code"
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
                      onChange={(event) => setCountry(event.target.value)}
                      required
                      autoComplete="country"
                      className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                    >
                      {countryOptions.map((option) => (
                        <option key={option.code} value={option.code}>{option.name}</option>
                      ))}
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
                    onChange={(event) => setPhone(event.target.value)}
                    autoComplete="tel"
                    className="w-full rounded-md border border-border bg-background px-4 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                  />
                </div>
              </div>
            </section>

            {quote && (
              <fieldset className="space-y-3">
                <legend className="mb-3 text-xl font-semibold">Shipping Method</legend>
                {quote.rates.map((rate) => (
                  <label
                    key={rate.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-border p-4 has-[:checked]:border-accent"
                  >
                    <input
                      type="radio"
                      name="shippingRate"
                      value={rate.id}
                      checked={selectedRateId === rate.id}
                      onChange={() => setSelectedRateId(rate.id)}
                      className="mt-1 accent-accent"
                    />
                    <span className="flex-1">
                      <span className="block font-medium">{rate.name}</span>
                      {rate.minDeliveryDays && rate.maxDeliveryDays && (
                        <span className="text-xs text-muted-foreground">
                          Estimated {rate.minDeliveryDays}–{rate.maxDeliveryDays} business days
                        </span>
                      )}
                    </span>
                    <span className="font-semibold">
                      {formatPrice(fromMinorUnits(rate.amountCents, rate.currency), rate.currency)}
                    </span>
                  </label>
                ))}
                <button
                  type="button"
                  onClick={handlePreparePayment}
                  disabled={loading || !selectedRate || !stripePromise}
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-accent py-3.5 font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
                >
                  {loading ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-5" />}
                  Continue to secure payment
                </button>
              </fieldset>
            )}

            {!quote && (
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-accent py-3.5 font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : null}
                {loading ? 'Calculating shipping...' : 'Calculate shipping'}
              </button>
            )}

            {error && (
              <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </form>

          {clientSecret && stripePromise && paymentTotalCents !== null && (
            <div className="mt-6 rounded-lg border border-border bg-background p-6">
              <h2 className="mb-4 text-xl font-semibold">Payment</h2>
              <Elements
                key={clientSecret}
                stripe={stripePromise}
                options={{ clientSecret, appearance: { theme: 'stripe' } }}
              >
                <PaymentForm
                  totalCents={paymentTotalCents}
                  currency={paymentCurrency}
                  orderId={orderId}
                  onSuccess={(status) => {
                    clear()
                    router.push(
                      `/checkout/success?order_id=${encodeURIComponent(orderId)}&payment_status=${status}`,
                    )
                  }}
                />
              </Elements>
            </div>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Secure payment powered by Stripe
          </p>
        </div>

        <div>
          <div className="rounded-lg border border-border bg-secondary/20 p-6">
            <h2 className="mb-4 text-xl font-semibold">Order Summary</h2>
            <div className="mb-4 space-y-3">
              {displayedItems.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative size-16 shrink-0 overflow-hidden rounded border border-border">
                    <Image
                      src={items.find((cartItem) => cartItem.variantId === item.id)?.image || '/placeholder.svg'}
                      alt={item.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.color} / {item.size}</p>
                    <p className="mt-1 text-sm">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {formatPrice(fromMinorUnits(item.priceCents, displayedCurrency) * item.quantity, displayedCurrency)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(displayedSubtotal, displayedCurrency)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>
                  {selectedRate
                    ? formatPrice(fromMinorUnits(selectedRate.amountCents, selectedRate.currency), selectedRate.currency)
                    : 'Calculated for your address'}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>
                  {quote && selectedRate
                    ? formatPrice(
                      fromMinorUnits(selectedRate.taxCents, quote.currency),
                      quote.currency,
                    )
                    : 'Calculated after address'}
                </span>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-lg font-semibold">
                <span>Total</span>
                <span>
                  {selectedRate
                    ? formatPrice(fromMinorUnits(selectedRate.totalCents, selectedRate.currency), selectedRate.currency)
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PaymentForm({
  totalCents,
  currency,
  orderId,
  onSuccess,
}: {
  totalCents: number
  currency: string
  orderId: string
  onSuccess: (status: 'succeeded' | 'processing') => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [paymentError, setPaymentError] = useState('')

  async function handlePayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setPaymentError('')

    const returnUrl = `${window.location.origin}/checkout/success?order_id=${encodeURIComponent(orderId)}`
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: returnUrl },
        redirect: 'if_required',
      })

      if (result.error) {
        setPaymentError(result.error.message || 'Payment could not be completed. Please try again.')
        setSubmitting(false)
        return
      }

      if (result.paymentIntent?.status === 'succeeded' || result.paymentIntent?.status === 'processing') {
        onSuccess(result.paymentIntent.status)
        return
      }

      setPaymentError('Payment is not complete yet. Please try again.')
      setSubmitting(false)
    } catch (error) {
      console.error('[Checkout] Stripe payment confirmation failed:', error)
      setPaymentError('Payment could not be completed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handlePayment} className="space-y-4">
      <PaymentElement />
      {paymentError && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          {paymentError}
        </div>
      )}
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-accent py-3.5 font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
      >
        {submitting ? <Loader2 className="size-5 animate-spin" /> : <Lock className="size-5" />}
        {submitting
          ? 'Processing payment...'
          : `Pay ${formatPrice(fromMinorUnits(totalCents, currency), currency)}`}
      </button>
    </form>
  )
}

function isCheckoutQuote(value: unknown): value is CheckoutQuote {
  return (
    isRecord(value) &&
    typeof value.currency === 'string' &&
    typeof value.subtotalCents === 'number' &&
    Array.isArray(value.items) &&
    value.items.every((item) =>
      isRecord(item) &&
      typeof item.id === 'string' &&
      typeof item.title === 'string' &&
      typeof item.color === 'string' &&
      typeof item.size === 'string' &&
      typeof item.priceCents === 'number' &&
      typeof item.quantity === 'number',
    ) &&
    Array.isArray(value.rates) &&
    value.rates.every((rate) =>
      isRecord(rate) &&
      typeof rate.id === 'string' &&
      typeof rate.name === 'string' &&
      typeof rate.amountCents === 'number' &&
      typeof rate.currency === 'string' &&
      typeof rate.taxCents === 'number' &&
      typeof rate.totalCents === 'number',
    )
  )
}

function getErrorMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.message === 'string' ? value.message : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
