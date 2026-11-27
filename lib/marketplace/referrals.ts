import { cookies } from 'next/headers'
import { getResellerByReferralCode } from '@/lib/marketplace/db'

export const RESELLER_REFERRAL_COOKIE = 'masidy_referrer'
export const RESELLER_REFERRAL_WINDOW_SECONDS = 60 * 60 * 24 * 30

export async function getActiveResellerReferral() {
  const cookieStore = await cookies()
  const referralCode = cookieStore.get(RESELLER_REFERRAL_COOKIE)?.value
  if (!referralCode || !/^M[A-F0-9]{14}$/.test(referralCode)) return null
  return getResellerByReferralCode(referralCode)
}
