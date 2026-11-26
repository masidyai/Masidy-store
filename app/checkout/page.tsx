'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Check, CreditCard, Loader2, Lock, MapPin } from 'lucide-react'
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
  digitizationCents: number
  otherFeesCents: number
  subtotalCents: number
  adjustmentCents: number
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
const checkoutInputClassName =
  'min-h-12 w-full rounded-md border border-border bg-background px-4 py-3 text-base focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20 sm:text-sm'

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
  const shippingFormRef = useRef<HTMLFormElement>(null)
  const paymentSectionRef = useRef<HTMLElement>(null)

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

  const selectedRate = quote?.rates.find((rate) => rate.id === selectedRateId)
  const isPaymentStep = Boolean(clientSecret && stripePromise && paymentTotalCents !== null)

  useEffect(() => {
    if (isPaymentStep) {
      paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isPaymentStep])

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <p className="text-muted-foreground">Your cart is empty</p>
      </div>
    )
  }

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

  function returnToShipping() {
    setClientSecret('')
    setOrderId('')
    setPaymentTotalCents(null)
    setError('')
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
    ? fromMinorUnits(selectedRate?.subtotalCents ?? quote.subtotalCents, quote.currency)
    : subtotal

  return (
    <div className="mx-auto max-w-7xl px-4 pb-32 pt-6 sm:py-8 md:px-6 md:py-12">
      <Link
        href="/search"
        className="mb-5 inline-flex min-h-10 items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-accent sm:mb-6"
      >
        <ArrowLeft className="size-4" />
        Continue Shopping
      </Link>

      <h1 className="mb-5 text-3xl font-bold sm:mb-6">Checkout</h1>

      <ol aria-label="Checkout progress" className="mb-7 flex max-w-xl items-center gap-3 sm:mb-10">
        <li
          aria-current={isPaymentStep ? undefined : 'step'}
          className={`flex min-w-0 items-center gap-2.5 ${isPaymentStep ? 'text-muted-foreground' : 'text-foreground'}`}
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground">
            {isPaymentStep ? <Check className="size-4" /> : '1'}
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Delivery</span>
            <span className="hidden text-xs text-muted-foreground sm:block">Address and shipping</span>
          </span>
        </li>
        <li aria-hidden="true" className="h-px min-w-5 flex-1 bg-border" />
        <li
          aria-current={isPaymentStep ? 'step' : undefined}
          className={`flex min-w-0 items-center gap-2.5 ${isPaymentStep ? 'text-foreground' : 'text-muted-foreground'}`}
        >
          <span className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${isPaymentStep ? 'bg-accent text-accent-foreground' : 'border border-border bg-background'}`}>
            2
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-semibold">Payment</span>
            <span className="hidden text-xs text-muted-foreground sm:block">Secure checkout</span>
          </span>
        </li>
      </ol>

      <div className="grid items-start gap-6 lg:grid-cols-2 lg:gap-8">
        <aside className="order-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-border bg-secondary/20 p-4 sm:p-6">
            <h2 className="mb-4 text-lg font-semibold sm:text-xl">Order Summary</h2>
            <div className="mb-4 space-y-3">
              {displayedItems.map((item) => (
                <div key={item.id} className="flex gap-3 sm:gap-4">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-md border border-border bg-background sm:size-16">
                    <Image
                      src={items.find((cartItem) => cartItem.variantId === item.id)?.image || '/placeholder.svg'}
                      alt={item.title}
                      fill
                      sizes="64px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{item.title}</p>
                    <p className="text-xs text-muted-foreground">{item.color} / {item.size}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Qty: {item.quantity}</p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {formatPrice(fromMinorUnits(item.priceCents, displayedCurrency) * item.quantity, displayedCurrency)}
                  </p>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-3 sm:pt-4">
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
                <span className="text-muted-foreground">Tax / VAT (estimated)</span>
                <span>
                  {quote && selectedRate
                    ? formatPrice(
                      fromMinorUnits(selectedRate.taxCents, quote.currency),
                      quote.currency,
                    )
                    : 'Calculated after address'}
                </span>
              </div>
              {quote && selectedRate && selectedRate.digitizationCents > 0 && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Artwork setup</span>
                    <span>{formatPrice(fromMinorUnits(selectedRate.digitizationCents, quote.currency), quote.currency)}</span>
                </div>
              )}
              {quote && selectedRate && selectedRate.otherFeesCents > 0 && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Additional fees</span>
                    <span>{formatPrice(fromMinorUnits(selectedRate.otherFeesCents, quote.currency), quote.currency)}</span>
                </div>
              )}
              {quote && selectedRate && selectedRate.adjustmentCents !== 0 && (
                <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Price adjustment</span>
                    <span>{formatPrice(fromMinorUnits(selectedRate.adjustmentCents, quote.currency), quote.currency)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold sm:text-lg">
                <span>Total</span>
                <span>
                  {selectedRate
                    ? formatPrice(fromMinorUnits(selectedRate.totalCents, selectedRate.currency), selectedRate.currency)
                    : formatPrice(displayedSubtotal, displayedCurrency)}
                </span>
              </div>
              {!selectedRate && (
                <p className="text-xs text-muted-foreground">
                  Shipping, setup fees, and taxes are confirmed before payment.
                </p>
              )}
            </div>
          </div>
        </aside>

        <div className="order-2 min-w-0 lg:order-1">
          {!isPaymentStep ? (
          <form ref={shippingFormRef} onSubmit={handleShippingQuote} className="space-y-6">
            <section>
              <h2 className="mb-4 text-lg font-semibold sm:text-xl">Contact Information</h2>
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
                className={`${checkoutInputClassName} disabled:opacity-50`}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                We&apos;ll send your order confirmation here
              </p>
            </section>

            <section>
              <h2 className="mb-4 text-lg font-semibold sm:text-xl">Shipping Address</h2>
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
                    className={checkoutInputClassName}
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
                    className={checkoutInputClassName}
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
                    className={checkoutInputClassName}
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
                      className={checkoutInputClassName}
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
                      className={checkoutInputClassName}
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
                      className={checkoutInputClassName}
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
                      className={checkoutInputClassName}
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
                    className={checkoutInputClassName}
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
                  className="hidden w-full items-center justify-center gap-2 rounded-md bg-accent py-3.5 font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 sm:flex"
                >
                  {loading ? <Loader2 className="size-5 animate-spin" /> : <CreditCard className="size-5" />}
                  Continue to secure payment
                </button>
              </fieldset>
            )}

            {!quote && (
              <button
                type="submit"
                disabled={loading}
                className="hidden w-full items-center justify-center gap-2 rounded-md bg-accent py-3.5 font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50 sm:flex"
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
          ) : (
            <section
              ref={paymentSectionRef}
              aria-labelledby="payment-title"
              className="scroll-mt-24 rounded-xl border border-border bg-background p-4 sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 id="payment-title" className="text-lg font-semibold sm:text-xl">Payment</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your delivery and total are confirmed. Choose how you&apos;d like to pay.
                  </p>
                </div>
                <Lock className="mt-1 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
              </div>
              <div className="mb-5 rounded-lg bg-secondary/40 p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Paying</span>
                  <span className="font-semibold">
                    {formatPrice(fromMinorUnits(paymentTotalCents ?? 0, paymentCurrency), paymentCurrency)}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">{email}</p>
              </div>
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
              <button
                type="button"
                onClick={returnToShipping}
                className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-4" />
                Edit delivery details
              </button>
            </section>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            <Lock className="mr-1 inline size-3" aria-hidden="true" />
            Secure payment powered by Stripe
          </p>
        </div>
      </div>

      {!isPaymentStep && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur sm:hidden">
          <div className="mx-auto flex max-w-xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">{selectedRate ? 'Total' : 'Subtotal'}</p>
              <p className="truncate text-base font-semibold">
                {formatPrice(
                  selectedRate
                    ? fromMinorUnits(selectedRate.totalCents, selectedRate.currency)
                    : displayedSubtotal,
                  selectedRate?.currency ?? displayedCurrency,
                )}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                if (quote) {
                  void handlePreparePayment()
                } else {
                  shippingFormRef.current?.requestSubmit()
                }
              }}
              disabled={loading || Boolean(quote && (!selectedRate || !stripePromise))}
              className="flex min-h-12 flex-1 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : quote ? (
                <CreditCard className="size-4" />
              ) : (
                <MapPin className="size-4" />
              )}
              {loading ? 'Please wait...' : quote ? 'Continue to payment' : 'Calculate shipping'}
            </button>
          </div>
        </div>
      )}
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
    typeof value.adjustmentCents === 'number' &&
    typeof value.markupCents === 'number' &&
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
      typeof rate.digitizationCents === 'number' &&
      typeof rate.otherFeesCents === 'number' &&
      typeof rate.subtotalCents === 'number' &&
      typeof rate.adjustmentCents === 'number' &&
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
