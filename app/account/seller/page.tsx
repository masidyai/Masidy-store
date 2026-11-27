import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { SellerDashboard } from '@/components/marketplace/seller-dashboard'
import { PayoutAccountSetup } from '@/components/marketplace/payout-account-setup'

export default async function SellerPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/account/seller')
  if (!user.isSeller) redirect('/account')

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold">Seller dashboard</h1>
      <p className="mt-2 text-muted-foreground">Create product drafts, then submit them for review.</p>
      <div className="mt-8">
        <PayoutAccountSetup />
      </div>
      <SellerDashboard />
    </main>
  )
}
