import fetchHandler from 'vinext/server/fetch-handler'
import { releaseMatureMarketplaceTransfers } from '@/lib/marketplace/payouts'

interface WorkerBindings {
  MARKETPLACE_CHECKOUT_ENABLED?: string
  STRIPE_SECRET_KEY?: string
}

interface CronController {
  cron: string
  scheduledTime: number
}

export default {
  fetch: (request: Request, bindings: WorkerBindings, context: ExecutionContext) =>
    fetchHandler.fetch(request, bindings, context),

  async scheduled(_controller: CronController, bindings: WorkerBindings) {
    if (String(bindings.MARKETPLACE_CHECKOUT_ENABLED).toLowerCase() !== 'true') {
      console.info('[Marketplace] Scheduled payout release skipped while checkout is disabled.')
      return
    }
    if (!bindings.STRIPE_SECRET_KEY) {
      throw new Error('Stripe is not configured for marketplace payout release.')
    }

    const result = await releaseMatureMarketplaceTransfers(bindings.STRIPE_SECRET_KEY)
    console.info('[Marketplace] Scheduled seller payout release completed:', result)
  },
}
