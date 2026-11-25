import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { authenticateUser } from '@/lib/auth/db'
import { createAndStoreSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 })
    }

    const user = await authenticateUser(String(email), String(password))
    if (!user) {
      return NextResponse.json({ message: 'Invalid email or password.' }, { status: 401 })
    }

    await createAndStoreSession(user.id)

    return NextResponse.json({ user })
  } catch {
    return NextResponse.json({ message: 'Unable to sign in right now.' }, { status: 500 })
  }
}
