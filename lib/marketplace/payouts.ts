import { sql } from '@/lib/db/client'
import { createMarketplaceTransfer, MarketplacePaymentError } from '@/lib/stripe/marketplace-payments'

interface MatureMarketplaceTransfer {
  seller_order_id: string
  destination_account_id: string | null
  transfers_active: number | boolean | null
  payouts_enabled: number | boolean | null
  transfer_group: string
  source_transaction_id: string
  amount_minor: number
  currency: string
}

interface MatureResellerTransfer {
  id: string
  destination_account_id: string | null
  transfers_active: number | boolean | null
  payouts_enabled: number | boolean | null
  transfer_group: string
  source_transaction_id: string
  amount_minor: number
  currency: string
}

export async function releaseMatureMarketplaceTransfers(secretKey: string) {
  const result = await sql<MatureMarketplaceTransfer>`
    SELECT so.id AS seller_order_id, pa.stripe_account_id AS destination_account_id,
      pa.transfers_active, pa.payouts_enabled, mo.transfer_group,
      mo.stripe_charge_id AS source_transaction_id, so.transfer_minor AS amount_minor, so.currency
    FROM marketplace_seller_orders so
    JOIN marketplace_orders mo ON mo.id = so.marketplace_order_id
    LEFT JOIN marketplace_payout_accounts pa ON pa.user_id = so.seller_user_id
    WHERE mo.status = 'paid'
      AND mo.refunded_minor = 0
      AND mo.dispute_status IN ('none', 'won')
      AND mo.stripe_charge_id IS NOT NULL
      AND so.status = 'delivered'
      AND so.transfer_status IN ('held', 'ready')
      AND so.stripe_transfer_id IS NULL
      AND so.delivered_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')
    ORDER BY so.delivered_at
    LIMIT 50
  `

  let transferred = 0
  let failed = 0
  for (const candidate of result.rows) {
    if (
      !candidate.destination_account_id ||
      !candidate.transfers_active ||
      !candidate.payouts_enabled
    ) {
      await sql`
        UPDATE marketplace_seller_orders
        SET transfer_error = 'Seller payout account is not ready for transfers.',
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ${candidate.seller_order_id} AND stripe_transfer_id IS NULL
      `
      failed += 1
      continue
    }

    await sql`
      UPDATE marketplace_seller_orders
      SET transfer_status = 'ready',
        transfer_error = NULL,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ${candidate.seller_order_id}
        AND transfer_status IN ('held', 'ready')
        AND stripe_transfer_id IS NULL
    `
    try {
      const transfer = await createMarketplaceTransfer({
        secretKey,
        referenceId: `seller-${candidate.seller_order_id}`,
        destinationAccountId: candidate.destination_account_id,
        sourceTransactionId: candidate.source_transaction_id,
        transferGroup: candidate.transfer_group,
        amountMinor: candidate.amount_minor,
        currency: candidate.currency,
      })
      await sql`
        UPDATE marketplace_seller_orders
        SET transfer_status = 'transferred',
          stripe_transfer_id = ${transfer.id},
          transfer_error = NULL,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ${candidate.seller_order_id}
          AND stripe_transfer_id IS NULL
      `
      transferred += 1
    } catch (error) {
      const message = error instanceof MarketplacePaymentError
        ? error.message
        : 'Seller transfer could not be completed.'
      await sql`
        UPDATE marketplace_seller_orders
        SET transfer_status = 'held',
          transfer_error = ${message.slice(0, 500)},
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ${candidate.seller_order_id}
          AND stripe_transfer_id IS NULL
      `
      console.error('[Marketplace] Seller transfer release failed:', candidate.seller_order_id, error)
      failed += 1
    }
  }

  const resellerResult = await sql<MatureResellerTransfer>`
    SELECT ra.id, pa.stripe_account_id AS destination_account_id,
      pa.transfers_active, pa.payouts_enabled, mo.transfer_group,
      mo.stripe_charge_id AS source_transaction_id, ra.amount_minor, ra.currency
    FROM marketplace_seller_referral_attributions ra
    JOIN marketplace_seller_orders so ON so.id = ra.seller_order_id
    JOIN marketplace_orders mo ON mo.id = ra.marketplace_order_id
    LEFT JOIN marketplace_payout_accounts pa ON pa.user_id = ra.reseller_user_id
    WHERE ra.status IN ('held', 'ready')
      AND ra.amount_minor > 0
      AND ra.available_at <= strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      AND ra.stripe_transfer_id IS NULL
      AND so.status = 'delivered'
      AND mo.status = 'paid'
      AND mo.refunded_minor = 0
      AND mo.dispute_status IN ('none', 'won')
      AND mo.stripe_charge_id IS NOT NULL
    ORDER BY ra.available_at
    LIMIT 50
  `

  for (const candidate of resellerResult.rows) {
    if (
      !candidate.destination_account_id ||
      !candidate.transfers_active ||
      !candidate.payouts_enabled
    ) {
      await sql`
        UPDATE marketplace_seller_referral_attributions
        SET transfer_error = 'Reseller payout account is not ready for transfers.',
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ${candidate.id} AND stripe_transfer_id IS NULL
      `
      failed += 1
      continue
    }

    await sql`
      UPDATE marketplace_seller_referral_attributions
      SET status = 'ready', transfer_error = NULL,
        updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ${candidate.id} AND status IN ('held', 'ready') AND stripe_transfer_id IS NULL
    `
    try {
      const transfer = await createMarketplaceTransfer({
        secretKey,
        referenceId: `reseller-${candidate.id}`,
        destinationAccountId: candidate.destination_account_id,
        sourceTransactionId: candidate.source_transaction_id,
        transferGroup: candidate.transfer_group,
        amountMinor: candidate.amount_minor,
        currency: candidate.currency,
      })
      await sql`
        UPDATE marketplace_seller_referral_attributions
        SET status = 'transferred', stripe_transfer_id = ${transfer.id}, transfer_error = NULL,
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ${candidate.id} AND stripe_transfer_id IS NULL
      `
      transferred += 1
    } catch (error) {
      const message = error instanceof MarketplacePaymentError
        ? error.message
        : 'Reseller transfer could not be completed.'
      await sql`
        UPDATE marketplace_seller_referral_attributions
        SET status = 'held', transfer_error = ${message.slice(0, 500)},
          updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
        WHERE id = ${candidate.id} AND stripe_transfer_id IS NULL
      `
      console.error('[Marketplace] Reseller transfer release failed:', candidate.id, error)
      failed += 1
    }
  }
  return {
    checked: result.rows.length + resellerResult.rows.length,
    transferred,
    failed,
  }
}
