import { getCurrentUser } from './session'
import { redirect } from 'next/navigation'

export async function requireAdmin() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/account')
  }

  if (!user.isAdmin) {
    redirect('/account')
  }

  return user
}

export async function checkIsAdmin(): Promise<boolean> {
  const user = await getCurrentUser()
  return user?.isAdmin || false
}
