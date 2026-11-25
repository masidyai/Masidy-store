import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/client'

export async function GET() {
  try {
    const ordersResult = await sql`
      SELECT COUNT(*) as count, SUM(total) as total_revenue, COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending
      FROM orders
    `

    const usersResult = await sql`
      SELECT COUNT(*) as count FROM users
    `

    const orders = ordersResult.rows[0] as any
    const users = usersResult.rows[0] as any

    return NextResponse.json({
      totalRevenue: parseFloat(orders.total_revenue || 0),
      totalOrders: parseInt(orders.count || 0),
      totalCustomers: parseInt(users.count || 0),
      pendingOrders: parseInt(orders.pending || 0),
    })
  } catch (error) {
    console.error('[Admin] Stats error:', error)
    return NextResponse.json(
      {
        totalRevenue: 0,
        totalOrders: 0,
        totalCustomers: 0,
        pendingOrders: 0,
      },
      { status: 200 },
    )
  }
}
