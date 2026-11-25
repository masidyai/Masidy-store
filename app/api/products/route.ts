import { NextResponse } from 'next/server'
import { getProducts } from '@/lib/products/api'

export async function GET() {
  try {
    const products = await getProducts()
    return NextResponse.json({ products })
  } catch (error) {
    console.error('[Products] Catalog request failed:', error)
    return NextResponse.json({ message: 'Failed to load products.' }, { status: 502 })
  }
}
