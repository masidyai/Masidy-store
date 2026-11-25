import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { getOrdersByUserId } from '@/lib/db/orders'

export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  const orders = await getOrdersByUserId(user.id)

  return NextResponse.json({ orders })
}
