import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { ResellerDashboard } from '@/components/marketplace/reseller-dashboard'
import { PayoutAccountSetup } from '@/components/marketplace/payout-account-setup'

export default async function ResellerPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=/account/reseller')
  if (!user.isReseller) redirect('/account')

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold">Reseller dashboard</h1>
      <p className="mt-2 text-muted-foreground">Share product links and track visits from your referrals.</p>
      <div className="mt-8">
        <PayoutAccountSetup />
      </div>
      <ResellerDashboard />
    </main>
  )
}
