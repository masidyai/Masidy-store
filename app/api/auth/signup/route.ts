import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { registerUser } from '@/lib/auth/db'
import { createAndStoreSession } from '@/lib/auth/session'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ message: 'Email and password are required.' }, { status: 400 })
    }

    const user = await registerUser(String(email), String(password), String(name || ''))
    await createAndStoreSession(user.id)

    return NextResponse.json({ user })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create account.'
    return NextResponse.json({ message }, { status: 400 })
  }
}
