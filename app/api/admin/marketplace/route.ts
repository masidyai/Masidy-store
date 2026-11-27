import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import {
  getMarketplaceCommissionSettings,
  listMarketplaceApplications,
  listSellerListingsForReview,
  reviewMarketplaceApplication,
  reviewSellerListing,
  updateMarketplaceCommissionSettings,
} from '@/lib/marketplace/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user?.isAdmin) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 })

  const [applications, listings, commissionSettings] = await Promise.all([
    listMarketplaceApplications(),
    listSellerListingsForReview(),
    getMarketplaceCommissionSettings(),
  ])
  return NextResponse.json({ applications: applications.rows, listings: listings.rows, commissionSettings })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user?.isAdmin) return NextResponse.json({ message: 'Forbidden.' }, { status: 403 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid review request.' }, { status: 400 })
  }
  if (!isRecord(body)) return NextResponse.json({ message: 'Invalid review request.' }, { status: 400 })

  const action = body.action
  if (action === 'settings') {
    const resellerRateBps = toRateBps(body.resellerRatePercent)
    const sellerRateBps = toRateBps(body.sellerRatePercent)
    if (resellerRateBps === null || sellerRateBps === null) {
      return NextResponse.json({ message: 'Commission rates must be between 0 and 99.99 with at most two decimal places.' }, { status: 400 })
    }
    try {
      await updateMarketplaceCommissionSettings(resellerRateBps, sellerRateBps)
      return NextResponse.json({ success: true })
    } catch (error) {
      console.error('[Admin] Marketplace commission settings update failed:', error)
      return NextResponse.json({ message: 'Could not save commission settings.' }, { status: 500 })
    }
  }

  const status = body.status
  const id = typeof body.id === 'string' ? body.id : ''
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''
  const taxCode = typeof body.taxCode === 'string' ? body.taxCode : null
  if (!id || (status !== 'approved' && status !== 'rejected')) {
    return NextResponse.json({ message: 'Choose an application or listing and a valid decision.' }, { status: 400 })
  }

  try {
    if (action === 'application') {
      await reviewMarketplaceApplication(id, status, note)
    } else if (action === 'listing') {
      if (status === 'approved' && !isMarketplaceTaxCode(taxCode)) {
        return NextResponse.json({ message: 'Select a supported physical-goods tax category before approving.' }, { status: 400 })
      }
      await reviewSellerListing(id, status, note, status === 'approved' ? taxCode : null)
    } else {
      return NextResponse.json({ message: 'Choose a valid review type.' }, { status: 400 })
    }
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Admin] Marketplace review failed:', error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : 'Could not save your review.' },
      { status: 409 },
    )
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toRateBps(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 99.99) return null
  const basisPoints = Math.round(value * 100)
  return basisPoints / 100 === value ? basisPoints : null
}

function isMarketplaceTaxCode(value: string | null): value is string {
  return value === 'txcd_99999999' || value === 'txcd_30011000'
}
