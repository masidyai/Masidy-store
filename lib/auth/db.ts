import { createSecureId, createSecureToken } from '@/lib/crypto'
import { sql } from '@/lib/db/client'
import { compare, hash } from 'bcryptjs'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  isAdmin?: boolean
  createdAt: string
}

export async function registerUser(email: string, password: string, name?: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`
  if (existing.rows.length > 0) {
    throw new Error('An account with this email already exists.')
  }

  const passwordHash = await hash(password, 12)
  const id = createSecureId()
  const result = await sql<{ id: string; email: string; name: string | null; created_at: string }>`
    INSERT INTO users (id, email, password_hash, name)
    VALUES (${id}, ${normalizedEmail}, ${passwordHash}, ${name?.trim() || null})
    RETURNING id, email, name, created_at
  `

  const row = result.rows[0]
  if (!row) throw new Error('User registration did not return the created user.')

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isAdmin: false, // New users are not admins by default
    createdAt: row.created_at,
  } satisfies AuthUser
}

export async function authenticateUser(email: string, password: string) {
  const normalizedEmail = email.trim().toLowerCase()
  const result = await sql<{
    id: string
    email: string
    name: string | null
    password_hash: string
    is_admin: boolean | number
    created_at: string
  }>`
    SELECT id, email, name, password_hash, is_admin, created_at
    FROM users
    WHERE email = ${normalizedEmail}
  `

  const row = result.rows[0]
  if (!row || !(await compare(password, row.password_hash))) return null

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isAdmin: Boolean(row.is_admin),
    createdAt: row.created_at,
  } satisfies AuthUser
}

export async function createSession(userId: string) {
  const token = createSecureToken()
  const id = createSecureId()
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()

  await sql`
    INSERT INTO sessions (id, user_id, token, expires_at)
    VALUES (${id}, ${userId}, ${token}, ${expiresAt})
  `

  return token
}

export async function getUserFromSession(token: string | undefined) {
  if (!token) return null

  const result = await sql<{
    id: string
    email: string
    name: string | null
    is_admin: boolean | number
    created_at: string
  }>`
    SELECT u.id, u.email, u.name, u.is_admin, u.created_at
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ${token} AND julianday(s.expires_at) > julianday('now')
  `

  const row = result.rows[0]
  if (!row) return null

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    isAdmin: Boolean(row.is_admin),
    createdAt: row.created_at,
  } satisfies AuthUser
}

export async function destroySession(token: string | undefined) {
  if (!token) return
  await sql`DELETE FROM sessions WHERE token = ${token}`
}

export async function updateUserProfile(userId: string, data: { name?: string }) {
  const { name } = data

  await sql`
    UPDATE users
    SET name = ${name?.trim() || null}
    WHERE id = ${userId}
  `
}

export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<boolean> {
  // Get current password hash
  const result = await sql`
    SELECT password_hash FROM users WHERE id = ${userId}
  `

  const row = result.rows[0] as { password_hash: string } | undefined
  if (!row) return false

  // Verify current password
  const isValid = await compare(currentPassword, row.password_hash)
  if (!isValid) return false

  // Hash and update new password
  const newPasswordHash = await hash(newPassword, 12)
  await sql`
    UPDATE users
    SET password_hash = ${newPasswordHash}
    WHERE id = ${userId}
  `

  return true
}
