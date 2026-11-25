import { NextResponse } from 'next/server'
import { createSecureToken } from '@/lib/crypto'
import { sql } from '@/lib/db/client'

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: unknown }

    if (typeof body.email !== 'string' || !body.email.trim()) {
      return NextResponse.json({ message: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = body.email.trim().toLowerCase()

    // Check if user exists
    const userResult = await sql`
      SELECT id FROM users WHERE email = ${normalizedEmail}
    `

    if (userResult.rows.length === 0) {
      // Don't reveal if email exists or not (security)
      return NextResponse.json({
        message: 'If an account exists, a reset link will be sent to your email.',
      })
    }

    const userId = userResult.rows[0].id

    // Create reset token
    const token = createSecureToken()
    const expiresAt = new Date(Date.now() + 3600000).toISOString() // 1 hour

    // Store reset token
    await sql`
      INSERT INTO password_reset_tokens (user_id, token, expires_at, created_at)
      VALUES (${userId}, ${token}, ${expiresAt}, ${new Date().toISOString()})
      ON CONFLICT (user_id)
      DO UPDATE SET token = ${token}, expires_at = ${expiresAt}, created_at = ${new Date().toISOString()}
    `

    // TODO: Send email with reset link
    // const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`
    // await sendPasswordResetEmail(email, resetUrl)

    return NextResponse.json({
      message: 'If an account exists, a reset link will be sent to your email.',
    })
  } catch (error) {
    console.error('[Password Reset] Error:', error)
    return NextResponse.json({ message: 'Failed to process request' }, { status: 500 })
  }
}
