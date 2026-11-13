import { createHmac, hkdfSync } from 'node:crypto'

// Its own label: the key of the limits is derived from NEXTAUTH_SECRET, but is never the key
// that signs and encrypts the sessions. A new version of the label gives new keys.
const LABEL = 'bytebank/rate-limit-keys/v1'
const KEY_BYTES = 32

export function deriveRateLimitKey(serverSecret: string): Uint8Array {
  return new Uint8Array(hkdfSync('sha256', serverSecret, '', LABEL, KEY_BYTES))
}

// What rate_limits stores instead of the email or the IP. A plain SHA-256 of an email can be
// found by hashing a list of known emails; an HMAC also needs the key, which only the server
// has. The namespace keeps two limits that see the same email apart.
export function rateLimitStorageKey(secret: Uint8Array, namespace: string, key: string): string {
  return createHmac('sha256', secret).update(`${namespace}:${key}`).digest('hex')
}
