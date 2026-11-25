import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json(
    { message: 'Apply database changes with the Cloudflare D1 migrations CLI.' },
    { status: 410 },
  )
}
