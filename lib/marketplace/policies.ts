export const MARKETPLACE_POLICIES = {
  reseller: {
    version: 'reseller-v1',
    title: 'Reseller program rules',
    rules: [
      'Promote only Masidy products using your assigned referral link.',
      'Do not make misleading product, pricing, delivery, or discount claims.',
      'Do not use spam, impersonation, or unauthorized brand assets to promote products.',
      'Referral earnings and payout terms are not active until Masidy publishes the program rates and payment terms.',
    ],
  },
  seller: {
    version: 'seller-v1',
    title: 'Seller marketplace rules',
    rules: [
      'List only products you have the right to sell and provide accurate descriptions and prices.',
      'Only submit products you can fulfill; ship marketplace orders yourself and provide valid tracking.',
      'Respond to customer issues and follow the marketplace returns and safety requirements.',
      'Listings require Masidy review and will remain unavailable for purchase until marketplace checkout and payout terms are enabled.',
    ],
  },
} as const

export type MarketplaceRole = keyof typeof MARKETPLACE_POLICIES
export type MarketplaceApplicationStatus = 'pending' | 'approved' | 'rejected'
