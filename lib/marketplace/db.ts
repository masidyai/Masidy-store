import { createSecureId, createSecureToken } from '@/lib/crypto'
import { sql } from '@/lib/db/client'
import type { MarketplaceSellerCountry } from './countries'
import type {
  MarketplaceApplicationStatus,
  MarketplaceRole,
} from './policies'

export interface MarketplaceApplication {
  role: MarketplaceRole
  status: MarketplaceApplicationStatus
  policyVersion: string
  reviewNote: string | null
  updatedAt: string
}

export interface SellerListing {
  id: string
  title: string
  description: string
  category: string
  imageUrl: string
  priceMinor: number
  currency: string
  shippingZones: ShippingZone[]
  taxCode: string | null
  status: 'draft' | 'pending_review' | 'approved' | 'rejected'
  reviewNote: string | null
  createdAt: string
}

export interface ShippingZone {
  country: string
  amountMinor: number
}

export interface PublicSellerListing extends SellerListing {
  sellerName: string
}

export interface MarketplaceCheckoutListing {
  listing: PublicSellerListing
  sellerUserId: string
}

interface ApplicationRow {
  role: MarketplaceRole
  status: MarketplaceApplicationStatus
  policy_version: string
  review_note: string | null
  updated_at: string
}

interface SellerListingRow {
  id: string
  title: string
  description: string
  category: string
  image_url: string
  price_minor: number
  currency: string
  shipping_zones: string
  tax_code: string | null
  status: SellerListing['status']
  review_note: string | null
  created_at: string
}

export async function getMarketplaceApplications(userId: string): Promise<MarketplaceApplication[]> {
  const result = await sql<ApplicationRow>`
    SELECT role, status, policy_version, review_note, updated_at
    FROM marketplace_applications
    WHERE user_id = ${userId}
  `
  return result.rows.map((row) => ({
    role: row.role,
    status: row.status,
    policyVersion: row.policy_version,
    reviewNote: row.review_note,
    updatedAt: row.updated_at,
  }))
}

export async function submitMarketplaceApplication(
  userId: string,
  role: MarketplaceRole,
  policyVersion: string,
) {
  const existing = await sql<{ status: MarketplaceApplicationStatus }>`
    SELECT status
    FROM marketplace_applications
    WHERE user_id = ${userId} AND role = ${role}
  `
  if (existing.rows[0]?.status === 'approved') {
    throw new Error('You already have access to this program.')
  }

  const now = new Date().toISOString()
  await sql`
    INSERT INTO marketplace_applications (
      id, user_id, role, status, policy_version, policy_accepted_at, review_note, created_at, updated_at
    ) VALUES (
      ${createSecureId()}, ${userId}, ${role}, 'pending', ${policyVersion}, ${now}, NULL, ${now}, ${now}
    )
    ON CONFLICT(user_id, role) DO UPDATE SET
      status = 'pending',
      policy_version = excluded.policy_version,
      policy_accepted_at = excluded.policy_accepted_at,
      review_note = NULL,
      updated_at = excluded.updated_at
  `
}

export async function listMarketplaceApplications() {
  return sql<{
    id: string
    user_id: string
    email: string
    name: string | null
    role: MarketplaceRole
    status: MarketplaceApplicationStatus
    policy_version: string
    policy_accepted_at: string
    review_note: string | null
    created_at: string
  }>`
    SELECT a.id, a.user_id, u.email, u.name, a.role, a.status, a.policy_version,
      a.policy_accepted_at, a.review_note, a.created_at
    FROM marketplace_applications a
    JOIN users u ON u.id = a.user_id
    ORDER BY CASE a.status WHEN 'pending' THEN 0 ELSE 1 END, a.created_at
  `
}

export async function reviewMarketplaceApplication(
  applicationId: string,
  status: 'approved' | 'rejected',
  reviewNote: string,
) {
  const result = await sql<{ user_id: string; role: MarketplaceRole }>`
    UPDATE marketplace_applications
    SET status = ${status}, review_note = ${reviewNote || null},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ${applicationId} AND status = 'pending'
    RETURNING user_id, role
  `
  const application = result.rows[0]
  if (!application) throw new Error('Application not found or already reviewed.')

  if (status === 'approved') {
    await sql`
      INSERT INTO marketplace_payout_accounts (user_id)
      VALUES (${application.user_id})
      ON CONFLICT(user_id) DO NOTHING
    `
    if (application.role === 'reseller') {
      const referralCode = `M${createSecureToken(7).toUpperCase()}`
      await sql`
        INSERT INTO reseller_profiles (user_id, referral_code)
        VALUES (${application.user_id}, ${referralCode})
        ON CONFLICT(user_id) DO NOTHING
      `
    }
  }
}

export async function getMarketplacePayoutAccount(userId: string) {
  const result = await sql<{
    stripe_account_id: string | null
    country: string | null
    transfers_active: number | boolean
    payouts_enabled: number | boolean
  }>`
    SELECT stripe_account_id, country, transfers_active, payouts_enabled
    FROM marketplace_payout_accounts
    WHERE user_id = ${userId}
  `
  const account = result.rows[0]
  return account ? {
    stripeAccountId: account.stripe_account_id,
    country: account.country,
    transfersActive: Boolean(account.transfers_active),
    payoutsEnabled: Boolean(account.payouts_enabled),
  } : null
}

export async function saveMarketplacePayoutAccount(input: {
  userId: string
  stripeAccountId: string
  country: MarketplaceSellerCountry
  transfersActive: boolean
  payoutsEnabled: boolean
}) {
  await sql`
    INSERT INTO marketplace_payout_accounts (
      user_id, stripe_account_id, country, transfers_active, payouts_enabled
    ) VALUES (
      ${input.userId}, ${input.stripeAccountId}, ${input.country},
      ${input.transfersActive}, ${input.payoutsEnabled}
    )
    ON CONFLICT(user_id) DO UPDATE SET
      stripe_account_id = excluded.stripe_account_id,
      country = excluded.country,
      transfers_active = excluded.transfers_active,
      payouts_enabled = excluded.payouts_enabled,
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE marketplace_payout_accounts.stripe_account_id IS NULL
      OR marketplace_payout_accounts.stripe_account_id = excluded.stripe_account_id
  `
  const saved = await getMarketplacePayoutAccount(input.userId)
  if (saved?.stripeAccountId !== input.stripeAccountId) {
    throw new Error('A different Stripe account is already linked to this user.')
  }
}

export async function updateMarketplacePayoutAccountStatus(input: {
  userId: string
  stripeAccountId: string
  transfersActive: boolean
  payoutsEnabled: boolean
}) {
  await sql`
    UPDATE marketplace_payout_accounts
    SET transfers_active = ${input.transfersActive},
      payouts_enabled = ${input.payoutsEnabled},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE user_id = ${input.userId} AND stripe_account_id = ${input.stripeAccountId}
  `
}

export async function getResellerDashboard(userId: string) {
  const result = await sql<{ referral_code: string; total_clicks: number; recent_clicks: number }>`
    SELECT p.referral_code,
      (SELECT COUNT(*) FROM reseller_referral_clicks c WHERE c.reseller_user_id = p.user_id) AS total_clicks,
      (SELECT COUNT(*) FROM reseller_referral_clicks c
        WHERE c.reseller_user_id = p.user_id
          AND c.created_at >= strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 days')) AS recent_clicks
    FROM reseller_profiles p
    WHERE p.user_id = ${userId}
  `
  const profile = result.rows[0]
  if (!profile) throw new Error('Reseller access is not active.')
  const earnings = await sql<{
    currency: string
    pending_minor: number
    paid_minor: number
    attributed_orders: number
  }>`
    SELECT ra.currency,
      SUM(CASE WHEN ra.status IN ('held', 'ready') THEN ra.amount_minor ELSE 0 END) AS pending_minor,
      SUM(CASE WHEN ra.status = 'transferred' THEN ra.amount_minor ELSE 0 END) AS paid_minor,
      COUNT(DISTINCT ra.marketplace_order_id) AS attributed_orders
    FROM marketplace_seller_referral_attributions ra
    JOIN marketplace_orders mo ON mo.id = ra.marketplace_order_id
    WHERE ra.reseller_user_id = ${userId}
      AND ra.status IN ('held', 'ready', 'transferred')
      AND mo.refunded_minor = 0
      AND mo.dispute_status IN ('none', 'won')
    GROUP BY ra.currency
    ORDER BY ra.currency
  `
  return {
    referralCode: profile.referral_code,
    referralUrl: `/r/${profile.referral_code}`,
    totalClicks: profile.total_clicks,
    recentClicks: profile.recent_clicks,
    marketplaceEarnings: earnings.rows,
  }
}

export async function trackResellerReferralClick(referralCode: string) {
  const reseller = await getResellerByReferralCode(referralCode)
  if (!reseller) return false

  await sql`
    INSERT INTO reseller_referral_clicks (id, reseller_user_id)
    VALUES (${createSecureId()}, ${reseller.userId})
  `
  return true
}

export async function getResellerByReferralCode(referralCode: string) {
  const profile = await sql<{ user_id: string }>`
    SELECT user_id FROM reseller_profiles WHERE referral_code = ${referralCode}
  `
  const reseller = profile.rows[0]
  return reseller ? { userId: reseller.user_id } : null
}

export async function getSellerListings(userId: string): Promise<SellerListing[]> {
  const result = await sql<SellerListingRow>`
    SELECT id, title, description, category, image_url, price_minor, currency,
      shipping_zones, tax_code, status, review_note, created_at
    FROM seller_listings
    WHERE seller_user_id = ${userId}
    ORDER BY created_at DESC
  `
  return result.rows.map(parseSellerListing)
}

export async function getPublicMarketplaceListings(): Promise<PublicSellerListing[]> {
  const result = await sql<SellerListingRow & { seller_name: string | null }>`
    SELECT l.id, l.title, l.description, l.category, l.image_url, l.price_minor,
      l.currency, l.shipping_zones, l.tax_code, l.status, l.review_note, l.created_at,
      u.name AS seller_name
    FROM seller_listings l
    JOIN users u ON u.id = l.seller_user_id
    WHERE l.status = 'approved' AND l.tax_code IS NOT NULL
    ORDER BY l.created_at DESC
  `
  return result.rows.map((row) => ({
    ...parseSellerListing(row),
    sellerName: row.seller_name?.trim() || 'Independent seller',
  }))
}

export async function getPublicMarketplaceListing(listingId: string): Promise<PublicSellerListing | null> {
  const result = await sql<SellerListingRow & { seller_name: string | null }>`
    SELECT l.id, l.title, l.description, l.category, l.image_url, l.price_minor,
      l.currency, l.shipping_zones, l.tax_code, l.status, l.review_note, l.created_at,
      u.name AS seller_name
    FROM seller_listings l
    JOIN users u ON u.id = l.seller_user_id
    WHERE l.id = ${listingId} AND l.status = 'approved' AND l.tax_code IS NOT NULL
  `
  const listing = result.rows[0]
  return listing ? {
    ...parseSellerListing(listing),
    sellerName: listing.seller_name?.trim() || 'Independent seller',
  } : null
}

export async function getMarketplaceCheckoutListings(): Promise<MarketplaceCheckoutListing[]> {
  const result = await sql<SellerListingRow & { seller_name: string | null; seller_user_id: string }>`
    SELECT l.id, l.title, l.description, l.category, l.image_url, l.price_minor,
      l.currency, l.shipping_zones, l.tax_code, l.status, l.review_note, l.created_at,
      l.seller_user_id, u.name AS seller_name
    FROM seller_listings l
    JOIN users u ON u.id = l.seller_user_id
    WHERE l.status = 'approved' AND l.tax_code IS NOT NULL
  `
  return result.rows.map((row) => ({
    listing: {
      ...parseSellerListing(row),
      sellerName: row.seller_name?.trim() || 'Independent seller',
    },
    sellerUserId: row.seller_user_id,
  }))
}

export async function createMarketplaceOrder(input: {
  checkoutKey: string
  checkoutFingerprint: string
  userId: string | null
  email: string
  referrerUserId: string | null
  resellerRateBps: number | null
  taxCalculationId: string
  currency: string
  shippingAddress: string
  subtotalMinor: number
  shippingMinor: number
  taxMinor: number
  totalMinor: number
  sellerRateBps: number
  sellerTaxes: Array<{
    sellerUserId: string
    taxCalculationId: string
    taxMinor: number
  }>
  lines: Array<{
    listingId: string
    sellerUserId: string
    title: string
    imageUrl: string
    quantity: number
    priceMinor: number
    shippingMinor: number
    taxCode: string
  }>
}) {
  const orderId = createSecureId()
  const transferGroup = `marketplace_${orderId}`
  const inserted = await sql<{
    id: string
    transfer_group: string
    checkout_fingerprint: string
    tax_calculation_id: string
    subtotal_minor: number
    shipping_minor: number
    tax_minor: number
    total_minor: number
    currency: string
    shipping_address: string
    payment_intent_id: string | null
    seller_rate_bps: number
  }>`
    INSERT INTO marketplace_orders (
      id, checkout_key, checkout_fingerprint, user_id, email, tax_calculation_id, transfer_group, status,
      subtotal_minor, shipping_minor, tax_minor, total_minor, currency, shipping_address, seller_rate_bps,
      referrer_user_id, reseller_rate_bps
    ) VALUES (
      ${orderId}, ${input.checkoutKey}, ${input.checkoutFingerprint}, ${input.userId}, ${input.email},
      ${input.taxCalculationId},
      ${transferGroup}, 'pending', ${input.subtotalMinor}, ${input.shippingMinor},
      ${input.taxMinor}, ${input.totalMinor}, ${input.currency}, ${input.shippingAddress}, ${input.sellerRateBps},
      ${input.referrerUserId}, ${input.resellerRateBps}
    )
    ON CONFLICT(checkout_key) DO NOTHING
    RETURNING id, transfer_group, checkout_fingerprint, tax_calculation_id,
      subtotal_minor, shipping_minor, tax_minor, total_minor, currency, shipping_address,
      payment_intent_id, seller_rate_bps
  `
  let order = inserted.rows[0]
  if (!order) {
    const existing = await sql<typeof inserted.rows[number]>`
      SELECT id, transfer_group, checkout_fingerprint, tax_calculation_id,
        subtotal_minor, shipping_minor, tax_minor, total_minor, currency, shipping_address,
        payment_intent_id, seller_rate_bps
      FROM marketplace_orders
      WHERE checkout_key = ${input.checkoutKey}
    `
    order = existing.rows[0]
    if (!order) throw new Error('The marketplace order could not be created.')
    if (
      order.checkout_fingerprint !== input.checkoutFingerprint ||
      order.subtotal_minor !== input.subtotalMinor ||
      order.shipping_minor !== input.shippingMinor ||
      order.tax_minor !== input.taxMinor ||
      order.total_minor !== input.totalMinor ||
      order.currency !== input.currency ||
      order.shipping_address !== input.shippingAddress
    ) {
      throw new Error('This checkout has changed. Start checkout again to review the updated total.')
    }
  }

  const linesBySeller = new Map<string, typeof input.lines>()
  for (const line of input.lines) {
    const sellerLines = linesBySeller.get(line.sellerUserId) ?? []
    sellerLines.push(line)
    linesBySeller.set(line.sellerUserId, sellerLines)
  }

  for (const [sellerUserId, lines] of linesBySeller) {
    const subtotalMinor = lines.reduce((sum, line) => sum + line.priceMinor * line.quantity, 0)
    const shippingMinor = lines.reduce((sum, line) => sum + line.shippingMinor * line.quantity, 0)
    const sellerTax = input.sellerTaxes.find((tax) => tax.sellerUserId === sellerUserId)
    if (!sellerTax) throw new Error('The seller tax calculation is missing.')
    const commissionMinor = Math.floor(subtotalMinor * order.seller_rate_bps / 10000)
    const transferMinor = subtotalMinor + shippingMinor - sellerTax.taxMinor - commissionMinor
    if (transferMinor < 1) throw new Error('The seller commission leaves no amount to transfer.')

    const insertedSellerOrder = await sql<{ id: string }>`
      INSERT INTO marketplace_seller_orders (
        id, marketplace_order_id, seller_user_id, status, subtotal_minor, shipping_minor,
        commission_minor, transfer_minor, currency, tax_calculation_id, tax_minor
      ) VALUES (
        ${createSecureId()}, ${order.id}, ${sellerUserId}, 'awaiting_payment', ${subtotalMinor},
        ${shippingMinor}, ${commissionMinor}, ${transferMinor}, ${input.currency},
        ${sellerTax.taxCalculationId}, ${sellerTax.taxMinor}
      )
      ON CONFLICT(marketplace_order_id, seller_user_id) DO NOTHING
      RETURNING id
    `
    const existingSellerOrder = insertedSellerOrder.rows[0] ?? (await sql<{ id: string }>`
      SELECT id FROM marketplace_seller_orders
      WHERE marketplace_order_id = ${order.id} AND seller_user_id = ${sellerUserId}
    `).rows[0]
    if (!existingSellerOrder) throw new Error('The seller order could not be created.')

    for (const line of lines) {
      await sql`
        INSERT INTO marketplace_order_items (
          id, seller_order_id, listing_id, title, image_url, quantity,
          unit_price_minor, shipping_minor, tax_code
        ) VALUES (
          ${createSecureId()}, ${existingSellerOrder.id}, ${line.listingId}, ${line.title},
          ${line.imageUrl}, ${line.quantity}, ${line.priceMinor}, ${line.shippingMinor}, ${line.taxCode}
        )
        ON CONFLICT(seller_order_id, listing_id) DO NOTHING
      `
    }
  }

  return {
    orderId: order.id,
    transferGroup: order.transfer_group,
    taxCalculationId: order.tax_calculation_id,
    paymentIntentId: order.payment_intent_id,
  }
}

export async function saveMarketplacePaymentIntent(orderId: string, paymentIntentId: string) {
  const result = await sql<{ payment_intent_id: string | null }>`
    UPDATE marketplace_orders
    SET payment_intent_id = ${paymentIntentId},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ${orderId}
      AND (payment_intent_id IS NULL OR payment_intent_id = ${paymentIntentId})
    RETURNING payment_intent_id
  `
  if (result.rows[0]?.payment_intent_id !== paymentIntentId) {
    throw new Error('A different payment is already linked to this marketplace order.')
  }
}

export async function getMarketplaceCommissionRatesBps() {
  const result = await sql<{ reseller_rate_bps: number | null; seller_rate_bps: number | null }>`
    SELECT reseller_rate_bps, seller_rate_bps
    FROM marketplace_commission_settings
    WHERE id = 1
  `
  const settings = result.rows[0]
  if (!settings) throw new Error('Marketplace commission settings have not been initialized.')
  return settings
}

export async function createSellerListing(input: {
  sellerUserId: string
  title: string
  description: string
  category: string
  imageUrl: string
  priceMinor: number
  currency: string
  shippingZones: ShippingZone[]
  status: 'draft' | 'pending_review'
}) {
  const id = createSecureId()
  await sql`
    INSERT INTO seller_listings (
      id, seller_user_id, title, description, category, image_url, price_minor,
      currency, shipping_zones, status
    ) VALUES (
      ${id}, ${input.sellerUserId}, ${input.title}, ${input.description}, ${input.category},
      ${input.imageUrl}, ${input.priceMinor}, ${input.currency},
      ${JSON.stringify(input.shippingZones)}, ${input.status}
    )
  `
  return id
}

export async function listSellerListingsForReview() {
  return sql<{
    id: string
    seller_user_id: string
    email: string
    title: string
    description: string
    category: string
    image_url: string
    price_minor: number
    currency: string
    shipping_zones: string
    tax_code: string | null
    status: SellerListing['status']
    created_at: string
  }>`
    SELECT l.id, l.seller_user_id, u.email, l.title, l.description, l.category,
      l.image_url, l.price_minor, l.currency, l.shipping_zones, l.tax_code, l.status, l.created_at
    FROM seller_listings l
    JOIN users u ON u.id = l.seller_user_id
    ORDER BY CASE l.status WHEN 'pending_review' THEN 0 ELSE 1 END, l.created_at DESC
  `
}

export async function getMarketplaceCommissionSettings() {
  const result = await sql<{ reseller_rate_bps: number | null; seller_rate_bps: number | null }>`
    SELECT reseller_rate_bps, seller_rate_bps
    FROM marketplace_commission_settings
    WHERE id = 1
  `
  const settings = result.rows[0]
  if (!settings) throw new Error('Marketplace commission settings have not been initialized.')
  return {
    resellerRatePercent: settings.reseller_rate_bps === null ? null : settings.reseller_rate_bps / 100,
    sellerRatePercent: settings.seller_rate_bps === null ? null : settings.seller_rate_bps / 100,
  }
}

export async function updateMarketplaceCommissionSettings(
  resellerRateBps: number,
  sellerRateBps: number,
) {
  await sql`
    UPDATE marketplace_commission_settings
    SET reseller_rate_bps = ${resellerRateBps},
      seller_rate_bps = ${sellerRateBps},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = 1
  `
}

export async function reviewSellerListing(
  listingId: string,
  status: 'approved' | 'rejected',
  reviewNote: string,
  taxCode: string | null,
) {
  const result = await sql<{ id: string }>`
    UPDATE seller_listings
    SET status = ${status}, review_note = ${reviewNote || null}, tax_code = ${taxCode},
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ${listingId} AND status = 'pending_review'
      AND (${status} != 'approved' OR ${taxCode} IS NOT NULL)
    RETURNING id
  `
  if (!result.rows[0]) throw new Error('Listing not found or already reviewed.')
}

function parseSellerListing(row: SellerListingRow): SellerListing {
  const zones: unknown = JSON.parse(row.shipping_zones)
  if (!Array.isArray(zones)) throw new TypeError('Seller listing shipping zones are invalid.')
  const parsedZones: ShippingZone[] = []
  const seenCountries = new Set<string>()
  for (const zone of zones) {
    if (
      typeof zone !== 'object' ||
      zone === null ||
      !('country' in zone) ||
      typeof zone.country !== 'string' ||
      !/^[A-Z]{2}$/.test(zone.country) ||
      seenCountries.has(zone.country) ||
      !('amountMinor' in zone) ||
      typeof zone.amountMinor !== 'number' ||
      !Number.isSafeInteger(zone.amountMinor) ||
      zone.amountMinor < 0
    ) {
      throw new TypeError('Seller listing shipping zones are invalid.')
    }
    seenCountries.add(zone.country)
    parsedZones.push({ country: zone.country, amountMinor: zone.amountMinor })
  }
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    imageUrl: row.image_url,
    priceMinor: row.price_minor,
    currency: row.currency,
    shippingZones: parsedZones,
    taxCode: row.tax_code,
    status: row.status,
    reviewNote: row.review_note,
    createdAt: row.created_at,
  }
}
