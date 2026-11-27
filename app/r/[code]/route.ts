import { NextResponse } from 'next/server'
import { trackResellerReferralClick } from '@/lib/marketplace/db'
import {
  RESELLER_REFERRAL_COOKIE,
  RESELLER_REFERRAL_WINDOW_SECONDS,
} from '@/lib/marketplace/referrals'
import { getSafeReferralDestination } from '@/lib/marketplace/referral-links'

interface ReferralRouteContext {
  params: Promise<{ code: string }>
}

export async function GET(request: Request, { params }: ReferralRouteContext) {
  const { code } = await params
  let isActiveReferral = false
  if (/^M[A-F0-9]{14}$/.test(code)) {
    try {
      isActiveReferral = await trackResellerReferralClick(code)
    } catch (error) {
      console.error('[Marketplace] Could not record reseller link visit:', error)
    }
  }

  const target = getSafeReferralDestination(new URL(request.url).searchParams.get('to'))
  const response = NextResponse.redirect(new URL(target, request.url))
  if (isActiveReferral) {
    response.cookies.set(RESELLER_REFERRAL_COOKIE, code, {
      httpOnly: true,
      secure: new URL(request.url).protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: RESELLER_REFERRAL_WINDOW_SECONDS,
    })
  }
  response.headers.set('Cache-Control', 'no-store')
  return response
}
