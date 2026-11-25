import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { changeUserPassword } from '@/lib/auth/db'

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { message: 'Current and new passwords are required' },
        { status: 400 }
      )
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'New password must be at least 6 characters' },
        { status: 400 }
      )
    }

    const success = await changeUserPassword(user.id, currentPassword, newPassword)

    if (!success) {
      return NextResponse.json({ message: 'Current password is incorrect' }, { status: 400 })
    }

    return NextResponse.json({ message: 'Password changed successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ message: 'Failed to change password' }, { status: 500 })
  }
}
