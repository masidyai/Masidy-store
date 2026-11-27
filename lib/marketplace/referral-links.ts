const ALLOWED_REFERRAL_PATHS = ['/search', '/product/', '/marketplace/', '/marketplace']

export function getSafeReferralDestination(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/search'
  }

  let destination: URL
  try {
    destination = new URL(value, 'https://masidy.store')
  } catch {
    return '/search'
  }

  if (destination.origin !== 'https://masidy.store') return '/search'
  const allowed = ALLOWED_REFERRAL_PATHS.some((path) =>
    path.endsWith('/') ? destination.pathname.startsWith(path) : destination.pathname === path,
  )
  return allowed ? `${destination.pathname}${destination.search}${destination.hash}` : '/search'
}
