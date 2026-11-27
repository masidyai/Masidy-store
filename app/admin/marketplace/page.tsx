import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { MarketplaceReviewDashboard } from '@/components/admin/marketplace-review-dashboard'

export default async function MarketplaceReviewPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/account')
  if (!user.isAdmin) redirect('/account')

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-12">
      <h1 className="text-3xl font-bold">Marketplace reviews</h1>
      <p className="mt-2 text-muted-foreground">Review program applications and seller listing submissions.</p>
      <MarketplaceReviewDashboard />
    </main>
  )
}
