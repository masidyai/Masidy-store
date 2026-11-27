'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { ArrowLeft, Loader2, Lock } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMarketplaceCart } from '@/components/marketplace/cart-provider'
import { MARKETPLACE_SELLER_COUNTRIES } from '@/lib/marketplace/countries'
import type { CheckoutAddress } from '@/lib/checkout/printful'
import { fromMinorUnits } from '@/lib/checkout/money'
import { formatPrice } from '@/lib/products/format'

interface MarketplaceQuote {
  currency: string
  subtotalMinor: number
  shippingMinor: number
  taxMinor: number
  totalMinor: number
  lines: Array<{
    listingId: string
    title: string
    quantity: number
    priceMinor: number
    shippingMinor: number
    sellerName: string
  }>
}

const countryNames = new Intl.DisplayNames(['en'], { type: 'region' })
const countryOptions = MARKETPLACE_SELLER_COUNTRIES
  .map((code) => ({ code, name: countryNames.of(code) || code }))
  .sort((a, b) => a.name.localeCompare(b.name))
const inputClass = 'min-h-12 w-full rounded-md border border-border bg-background px-4 py-3 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:text-sm'

export function MarketplaceCheckout() {
  const router = useRouter()
  const { items, currency, clear } = useMarketplaceCart()
  const [address, setAddress] = useState<CheckoutAddress>({
    name: '',
    email: '',
    address1: '',
    address2: '',
    city: '',
    state: '',
    zip: '',
    country: 'IT',
    phone: '',
  })
  const [quote, setQuote] = useState<MarketplaceQuote | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [orderId, setOrderId] = useState('')
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null)
  const [checkoutKey, setCheckoutKey] = useState('')

  const cartItems = useMemo(() => items.map(({ listingId, quantity }) => ({ listingId, quantity })), [items])
  const checkoutAddress = useMemo(() => ({ ...address }), [address])

  function updateAddress(field: keyof CheckoutAddress, value: string) {
    setAddress((current) => ({ ...current, [field]: value }))
    setQuote(null)
    setClientSecret('')
    setCheckoutKey('')
    setError('')
  }

  async function getQuote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setClientSecret('')
    try {
      const response = await fetch('/api/marketplace/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartItems, address: checkoutAddress }),
      })
      const result: unknown = await response.json()
      if (!response.ok || !isMarketplaceQuote(result)) {
        throw new Error(getMessage(result, 'Could not calculate your order total.'))
      }
      setQuote(result)
      setCheckoutKey(crypto.randomUUID())
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not calculate your order total.')
    } finally {
      setLoading(false)
    }
  }

  async function startPayment() {
    if (!quote || !checkoutKey) return
    setLoading(true)
    setError('')
    try {
      const configResponse = await fetch('/api/checkout')
      const config: unknown = await configResponse.json()
      if (!configResponse.ok || !isRecord(config) || typeof config.publishableKey !== 'string') {
        throw new Error(getMessage(config, 'Payments are not configured.'))
      }
      const paymentResponse = await fetch('/api/marketplace/checkout/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems,
          address: checkoutAddress,
          checkoutKey,
          expectedTotalMinor: quote.totalMinor,
        }),
      })
      const payment: unknown = await paymentResponse.json()
      if (
        !paymentResponse.ok ||
        !isRecord(payment) ||
        typeof payment.clientSecret !== 'string' ||
        typeof payment.orderId !== 'string' ||
        typeof payment.totalMinor !== 'number' ||
        payment.totalMinor !== quote.totalMinor ||
        payment.currency !== quote.currency
      ) {
        throw new Error(getMessage(payment, 'Could not start your payment.'))
      }
      setStripePromise(loadStripe(config.publishableKey))
      setClientSecret(payment.clientSecret)
      setOrderId(payment.orderId)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not start your payment.')
    } finally {
      setLoading(false)
    }
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-3xl font-semibold">Your marketplace bag is empty</h1>
        <Link href="/marketplace" className="mt-6 inline-flex min-h-11 items-center rounded-md bg-accent px-5 font-semibold text-accent-foreground">
          Browse marketplace
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-7 pb-16 md:px-6 md:py-10">
      <Link href="/marketplace/cart" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Back to marketplace bag
      </Link>
      <h1 className="mt-5 text-3xl font-bold">Marketplace checkout</h1>
      <p className="mt-2 text-sm text-muted-foreground">Your marketplace order is separate from other Masidy products.</p>

      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_360px]">
        <section>
          <form onSubmit={getQuote} className="space-y-4 rounded-lg border border-border p-4 sm:p-6">
            <h2 className="text-lg font-semibold">Delivery details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" autoComplete="name" required value={address.name} onChange={(value) => updateAddress('name', value)} />
              <Field label="Email" type="email" autoComplete="email" required value={address.email} onChange={(value) => updateAddress('email', value)} />
              <Field label="Address" autoComplete="address-line1" required value={address.address1} onChange={(value) => updateAddress('address1', value)} />
              <Field label="Apartment, suite (optional)" autoComplete="address-line2" value={address.address2 ?? ''} onChange={(value) => updateAddress('address2', value)} />
              <Field label="City" autoComplete="address-level2" required value={address.city} onChange={(value) => updateAddress('city', value)} />
              <Field label="State or region (optional)" autoComplete="address-level1" value={address.state ?? ''} onChange={(value) => updateAddress('state', value)} />
              <Field label="Postal code (optional)" autoComplete="postal-code" value={address.zip ?? ''} onChange={(value) => updateAddress('zip', value)} />
              <label className="block text-sm font-medium">
                Country
                <select required value={address.country} onChange={(event) => updateAddress('country', event.target.value)} className={`${inputClass} mt-1`}>
                  {countryOptions.map((country) => <option key={country.code} value={country.code}>{country.name}</option>)}
                </select>
              </label>
              <Field label="Phone (optional)" type="tel" autoComplete="tel" value={address.phone ?? ''} onChange={(value) => updateAddress('phone', value)} />
            </div>
            {!clientSecret && (
              <button type="submit" disabled={loading} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-accent px-5 font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Calculate shipping and tax
              </button>
            )}
          </form>

          {quote && !clientSecret && (
            <section className="mt-5 rounded-lg border border-border p-4 sm:p-6">
              <h2 className="text-lg font-semibold">Payment</h2>
              <p className="mt-2 text-sm text-muted-foreground">Review your total before continuing to secure payment.</p>
              <button type="button" onClick={startPayment} disabled={loading} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-accent px-5 font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
                {loading ? <Loader2 className="size-4 animate-spin" /> : null}
                Continue to secure payment
              </button>
            </section>
          )}

          {clientSecret && stripePromise && quote && (
            <section className="mt-5 rounded-lg border border-border p-4 sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">Secure payment</h2>
              <Elements key={clientSecret} stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                <MarketplacePaymentForm
                  orderId={orderId}
                  totalMinor={quote.totalMinor}
                  currency={quote.currency}
                  onSuccess={() => {
                    clear()
                    router.push(`/marketplace/checkout/success?order_id=${encodeURIComponent(orderId)}`)
                  }}
                />
              </Elements>
            </section>
          )}
          {error && <p role="alert" className="mt-4 rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
        </section>

        <aside className="h-fit rounded-lg border border-border p-4 sm:p-6">
          <h2 className="text-lg font-semibold">Order summary</h2>
          <ul className="mt-4 divide-y divide-border">
            {items.map((item) => (
              <li key={item.listingId} className="flex justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">{item.title} <span className="text-muted-foreground">× {item.quantity}</span></span>
                <span className="shrink-0 font-medium">{formatPrice(fromMinorUnits(item.priceMinor * item.quantity, item.currency), item.currency)}</span>
              </li>
            ))}
          </ul>
          {quote ? (
            <div className="mt-3 space-y-2 border-t border-border pt-4 text-sm">
              <SummaryLine label="Items" amount={quote.subtotalMinor} currency={quote.currency} />
              <SummaryLine label="Shipping" amount={quote.shippingMinor} currency={quote.currency} />
              <SummaryLine label="Included tax" amount={quote.taxMinor} currency={quote.currency} />
              <SummaryLine label="Total" amount={quote.totalMinor} currency={quote.currency} bold />
            </div>
          ) : (
            <div className="mt-3 flex justify-between border-t border-border pt-4 text-sm">
              <span>Subtotal</span>
              <span className="font-semibold">{formatPrice(fromMinorUnits(items.reduce((sum, item) => sum + item.priceMinor * item.quantity, 0), currency), currency)}</span>
            </div>
          )}
          <p className="mt-4 text-xs leading-5 text-muted-foreground">Each independent seller prepares and ships their own items. The listed prices include applicable tax where required; destination-specific shipping is calculated before payment.</p>
        </aside>
      </div>
    </main>
  )
}

function MarketplacePaymentForm({
  orderId,
  totalMinor,
  currency,
  onSuccess,
}: {
  orderId: string
  totalMinor: number
  currency: string
  onSuccess: () => void
}) {
  const stripe = useStripe()
  const elements = useElements()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!stripe || !elements) return
    setSubmitting(true)
    setError('')
    try {
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/marketplace/checkout/success?order_id=${encodeURIComponent(orderId)}`,
        },
        redirect: 'if_required',
      })
      if (result.error) {
        setError(result.error.message || 'Payment could not be completed. Please try again.')
        setSubmitting(false)
        return
      }
      if (result.paymentIntent?.status === 'succeeded' || result.paymentIntent?.status === 'processing') {
        onSuccess()
        return
      }
      setError('Payment is not complete yet. Please try again.')
      setSubmitting(false)
    } catch (paymentError) {
      console.error('[Marketplace] Payment confirmation failed:', paymentError)
      setError('Payment could not be completed. Please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <PaymentElement />
      {error && <p role="alert" className="rounded-md border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}
      <button type="submit" disabled={!stripe || !elements || submitting} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-accent px-5 font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-50">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : <Lock className="size-4" />}
        {submitting ? 'Processing payment...' : `Pay ${formatPrice(fromMinorUnits(totalMinor, currency), currency)}`}
      </button>
    </form>
  )
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  autoComplete,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input type={type} autoComplete={autoComplete} required={required} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} mt-1`} />
    </label>
  )
}

function SummaryLine({ label, amount, currency, bold = false }: { label: string; amount: number; currency: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-3 ${bold ? 'border-t border-border pt-3 text-base font-semibold' : ''}`}>
      <span>{label}</span>
      <span>{formatPrice(fromMinorUnits(amount, currency), currency)}</span>
    </div>
  )
}

function isMarketplaceQuote(value: unknown): value is MarketplaceQuote {
  return isRecord(value) &&
    typeof value.currency === 'string' &&
    typeof value.subtotalMinor === 'number' &&
    typeof value.shippingMinor === 'number' &&
    typeof value.taxMinor === 'number' &&
    typeof value.totalMinor === 'number' &&
    Array.isArray(value.lines)
}

function getMessage(value: unknown, fallback: string): string {
  return isRecord(value) && typeof value.message === 'string' ? value.message : fallback
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
