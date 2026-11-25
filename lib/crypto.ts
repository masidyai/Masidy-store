export function createSecureId(): string {
  return crypto.randomUUID().replace(/-/g, '')
}

export function createSecureToken(byteLength = 32): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(byteLength)), byte =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
