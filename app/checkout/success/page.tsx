import { Suspense } from 'react'
import Link from 'next/link'
import { CheckCircle, Package, Mail, ArrowRight } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth/session'

async function SuccessContent({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  const user = await getCurrentUser()
  const sessionId = searchParams.session_id

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 md:px-6 md:py-20">
      <div className="text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-green-100">
          <CheckCircle className="size-12 text-green-600" />
        </div>

        {/* Thank You Message */}
        <h1 className="mb-4 text-3xl font-bold md:text-4xl">Order Confirmed!</h1>
        <p className="mb-8 text-lg text-muted-foreground">
          Thank you for your order. We've received your payment and will start processing your
          order right away.
        </p>

        {/* Order Info */}
        {sessionId && (
          <div className="mb-8 rounded-lg border border-border bg-secondary/20 p-6">
            <p className="text-sm text-muted-foreground">Order Reference</p>
            <p className="mt-1 font-mono text-sm font-semibold">{sessionId.slice(-12)}</p>
          </div>
        )}

        {/* What's Next */}
        <div className="mb-10 grid gap-6 text-left md:grid-cols-2">
          <div className="rounded-lg border border-border bg-background p-6">
            <Mail className="mb-3 size-8 text-accent" />
            <h3 className="mb-2 font-semibold">Confirmation Email</h3>
            <p className="text-sm text-muted-foreground">
              We've sent a confirmation email with your order details and receipt.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-background p-6">
            <Package className="mb-3 size-8 text-accent" />
            <h3 className="mb-2 font-semibold">Production & Shipping</h3>
            <p className="text-sm text-muted-foreground">
              Your items will be processed and shipped within 3-7 business days.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
          {user ? (
            <Link
              href="/account/orders"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 font-semibold text-accent-foreground hover:bg-accent/90"
            >
              View Your Orders
              <ArrowRight className="size-4" />
            </Link>
          ) : (
            <Link
              href="/account"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-accent px-6 py-3 font-semibold text-accent-foreground hover:bg-accent/90"
            >
              Create Account
              <ArrowRight className="size-4" />
            </Link>
          )}

          <Link
            href="/search"
            className="inline-flex items-center justify-center rounded-md border border-border bg-background px-6 py-3 font-semibold hover:bg-secondary"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Help Section */}
        <div className="mt-12 rounded-lg border border-border bg-background p-6 text-center">
          <h3 className="mb-2 font-semibold">Need Help?</h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Questions about your order? We're here to help.
          </p>
          <div className="flex flex-col gap-2 text-sm sm:flex-row sm:justify-center">
            <Link href="/faq" className="text-accent hover:underline">
              FAQ
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link href="/shipping" className="text-accent hover:underline">
              Shipping Info
            </Link>
            <span className="hidden sm:inline">•</span>
            <Link href="/contact" className="text-accent hover:underline">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: { session_id?: string }
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-2xl px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <SuccessContent searchParams={searchParams} />
    </Suspense>
  )
}
