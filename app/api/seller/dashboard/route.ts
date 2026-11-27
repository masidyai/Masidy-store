import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getSellerListings } from '@/lib/marketplace/db'

export async function GET() {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ message: 'Please sign in.' }, { status: 401 })
  if (!user.isSeller) return NextResponse.json({ message: 'Seller access is not active.' }, { status: 403 })

  try {
    return NextResponse.json({ listings: await getSellerListings(user.id) })
  } catch (error) {
    console.error('[Marketplace] Could not load seller dashboard:', error)
    return NextResponse.json({ message: 'Could not load seller dashboard.' }, { status: 500 })
  }
}
