import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getMarketplaceApplications, submitMarketplaceApplication } from '@/lib/marketplace/db'
import { MARKETPLACE_POLICIES, type MarketplaceRole } from '@/lib/marketplace/policies'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Please sign in.' }, { status: 401 })

  const applications = await getMarketplaceApplications(user.id)
  return NextResponse.json({ applications })
}

export async function POST(request: Request) {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Please sign in.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid application.' }, { status: 400 })
  }
  if (!isRecord(body) || (body.role !== 'reseller' && body.role !== 'seller')) {
    return NextResponse.json({ message: 'Choose a valid marketplace program.' }, { status: 400 })
  }

  const role: MarketplaceRole = body.role
  const policy = MARKETPLACE_POLICIES[role]
  if (body.accepted !== true || body.policyVersion !== policy.version) {
    return NextResponse.json(
      { message: 'Review and accept the current program rules before applying.' },
      { status: 400 },
    )
  }

  try {
    await submitMarketplaceApplication(user.id, role, policy.version)
    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not submit your application.'
    return NextResponse.json({ message }, { status: 409 })
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
