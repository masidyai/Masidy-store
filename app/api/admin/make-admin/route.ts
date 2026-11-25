import { NextResponse } from 'next/server'
import { env } from 'cloudflare:workers'
import { getCurrentUser } from '@/lib/auth/session'
import { sql } from '@/lib/db/client'

async function matchesSetupToken(expected: string, provided: string): Promise<boolean> {
  const encoder = new TextEncoder()
  const [expectedHash, providedHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(expected)),
    crypto.subtle.digest('SHA-256', encoder.encode(provided)),
  ])
  const expectedBytes = new Uint8Array(expectedHash)
  const providedBytes = new Uint8Array(providedHash)
  let difference = 0

  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= expectedBytes[index] ^ providedBytes[index]
  }

  return difference === 0
}

/**
 * Promotes one authenticated user after verifying the one-time setup secret.
 */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
    }

    const expectedToken = env.ADMIN_SETUP_TOKEN
    const authorization = request.headers.get('authorization')
    const providedToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]

    if (!expectedToken) {
      return NextResponse.json({ message: 'Admin setup is not configured.' }, { status: 503 })
    }

    if (!providedToken || !(await matchesSetupToken(expectedToken, providedToken))) {
      return NextResponse.json(
        { message: 'Invalid admin setup token.' },
        { status: 403 },
      )
    }

    const promotion = await sql<{ id: string }>`
      UPDATE users
      SET is_admin = TRUE
      WHERE id = ${user.id}
        AND NOT EXISTS (SELECT 1 FROM users WHERE is_admin = TRUE)
      RETURNING id
    `

    if (promotion.rows.length === 0) {
      return NextResponse.json(
        { message: 'An admin already exists. Contact the existing admin for access.' },
        { status: 403 },
      )
    }

    return NextResponse.json({
      message: 'You are now an admin!',
      success: true,
    })
  } catch (error) {
    console.error('[Make Admin] Error:', error)
    return NextResponse.json({ message: 'Failed to grant admin access' }, { status: 500 })
  }
}
