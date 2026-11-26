const SIGNATURE_TOLERANCE_SECONDS = 300

export type StripeWebhookEvent = {
  type: string
  data: {
    object: Record<string, unknown>
  }
}

export async function verifyStripeSignature(
  body: string,
  signatureHeader: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<StripeWebhookEvent> {
  const fields = signatureHeader.split(',').map((field) => {
    const separator = field.indexOf('=')
    return separator < 0
      ? ['', '']
      : [field.slice(0, separator).trim(), field.slice(separator + 1).trim()]
  })
  const timestampValue = fields.find(([key]) => key === 't')?.[1]
  const signatures = fields
    .filter(([key, value]) => key === 'v1' && /^[a-f\d]{64}$/i.test(value))
    .map(([, value]) => value.toLowerCase())

  if (!timestampValue || !/^\d+$/.test(timestampValue) || signatures.length === 0) {
    throw new Error('Malformed Stripe signature header')
  }

  const timestamp = Number(timestampValue)
  if (!Number.isSafeInteger(timestamp) || Math.abs(nowSeconds - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
    throw new Error('Stripe signature timestamp is outside the tolerance')
  }

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${timestampValue}.${body}`),
  )
  const expected = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')

  if (!signatures.some((signature) => constantTimeEqual(signature, expected))) {
    throw new Error('Stripe signature does not match')
  }

  const event: unknown = JSON.parse(body)
  if (
    !event ||
    typeof event !== 'object' ||
    !('type' in event) ||
    typeof event.type !== 'string' ||
    !('data' in event) ||
    !event.data ||
    typeof event.data !== 'object' ||
    !('object' in event.data) ||
    !event.data.object ||
    typeof event.data.object !== 'object'
  ) {
    throw new Error('Invalid Stripe event payload')
  }

  return event as StripeWebhookEvent
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let difference = 0
  for (let index = 0; index < right.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return difference === 0
}
