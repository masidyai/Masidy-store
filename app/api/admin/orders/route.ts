import { NextResponse } from 'next/server'
import { sql } from '@/lib/db/client'

export async function GET() {
  try {
    const result = await sql`
      SELECT id, email, total, currency, status, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 100
    `

    return NextResponse.json({ orders: result.rows })
  } catch (error) {
    console.error('[Admin] Orders error:', error)
    return NextResponse.json({ orders: [] }, { status: 200 })
  }
}
