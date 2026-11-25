import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { updateUserProfile } from '@/lib/auth/db'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name } = body

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ message: 'Name is required' }, { status: 400 })
    }

    await updateUserProfile(user.id, { name: name.trim() })

    return NextResponse.json({ message: 'Profile updated successfully' })
  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ message: 'Failed to update profile' }, { status: 500 })
  }
}
