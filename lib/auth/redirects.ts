const REDIRECT_BASE = 'https://masidy.store'

export function getSafePostLoginRedirect(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) {
    return '/account'
  }

  const destination = new URL(value, REDIRECT_BASE)
  if (destination.origin !== REDIRECT_BASE || destination.pathname === '/login') {
    return '/account'
  }
  return `${destination.pathname}${destination.search}${destination.hash}`
}
