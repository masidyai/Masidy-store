import assert from 'node:assert/strict'
import { test } from 'node:test'
import { verifyStripeSignature } from '../lib/stripe/webhook-signature'

const secret = 'whsec_test_secret'
const timestamp = 1_700_000_000
const payload = JSON.stringify({
  type: 'checkout.session.completed',
  data: { object: { id: 'cs_test_123' } },
})

async function sign(body: string, signedAt = timestamp): Promise<string> {
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
    new TextEncoder().encode(`${signedAt}.${body}`),
  )
  const signature = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
  return `t=${signedAt},v1=${signature}`
}

test('accepts a valid recent Stripe signature', async () => {
  const event = await verifyStripeSignature(payload, await sign(payload), secret, timestamp)

  assert.equal(event.type, 'checkout.session.completed')
  assert.equal(event.data.object.id, 'cs_test_123')
})

test('rejects a signature that does not match the body', async () => {
  const signature = await sign(payload)

  await assert.rejects(
    verifyStripeSignature(`${payload} `, signature, secret, timestamp),
    /signature does not match/,
  )
})

test('rejects stale signatures', async () => {
  const signature = await sign(payload)

  await assert.rejects(
    verifyStripeSignature(payload, signature, secret, timestamp + 301),
    /outside the tolerance/,
  )
})

test('accepts any valid v1 signature during secret rotation', async () => {
  const signature = await sign(payload)

  const event = await verifyStripeSignature(
    payload,
    `t=${timestamp},v1=${'0'.repeat(64)},${signature.split(',')[1]}`,
    secret,
    timestamp,
  )

  assert.equal(event.type, 'checkout.session.completed')
})
