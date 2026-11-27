import { MarketplaceCheckoutSuccess } from '@/components/marketplace/marketplace-checkout-success'

interface MarketplaceCheckoutSuccessPageProps {
  searchParams: Promise<{ order_id?: string }>
}

export default async function MarketplaceCheckoutSuccessPage({ searchParams }: MarketplaceCheckoutSuccessPageProps) {
  const { order_id: orderId } = await searchParams
  return <MarketplaceCheckoutSuccess orderId={orderId ?? ''} />
}
