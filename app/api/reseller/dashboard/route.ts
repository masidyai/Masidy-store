import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getResellerDashboard } from '@/lib/marketplace/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Please sign in.' }, { status: 401 })
  if (!user.isReseller) return NextResponse.json({ message: 'Reseller access is not active.' }, { status: 403 })

  try {
    return NextResponse.json(await getResellerDashboard(user.id))
  } catch (error) {
    console.error('[Marketplace] Could not load reseller dashboard:', error)
    return NextResponse.json({ message: 'Could not load reseller dashboard.' }, { status: 500 })
  }
}
