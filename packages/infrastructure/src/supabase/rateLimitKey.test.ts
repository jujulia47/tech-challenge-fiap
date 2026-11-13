import { createHash, hkdfSync } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { deriveRateLimitKey, rateLimitStorageKey } from './rateLimitKey'

// Made up for the test: base64 of 32 bytes, like the secrets of the README
const SECRET = btoa('s'.repeat(32))
const OTHER_SECRET = btoa('o'.repeat(32))
const EMAIL = 'ana.souza@bytebank.com'

describe('deriveRateLimitKey', () => {
  it('gives 32 bytes, always the same for one secret', () => {
    expect(deriveRateLimitKey(SECRET)).toHaveLength(32)
    expect(deriveRateLimitKey(SECRET)).toEqual(deriveRateLimitKey(SECRET))
  })

  it('is not the secret of the sessions, nor a key derived without its own label', () => {
    const key = Buffer.from(deriveRateLimitKey(SECRET))

    expect(key.equals(Buffer.from(atob(SECRET), 'binary'))).toBe(false)
    expect(key.equals(Buffer.from(hkdfSync('sha256', SECRET, '', '', 32)))).toBe(false)
  })
})

describe('rateLimitStorageKey', () => {
  const key = (secret: string, namespace = 'login-email', input = EMAIL) => rateLimitStorageKey(deriveRateLimitKey(secret), namespace, input)

  it('gives the same key for the same input, so the counter is found again', () => {
    expect(key(SECRET)).toBe(key(SECRET))
    expect(key(SECRET)).toMatch(/^[0-9a-f]{64}$/)
  })

  it('gives another key with another secret', () => {
    expect(key(SECRET)).not.toBe(key(OTHER_SECRET))
  })

  it('keeps two limits that see the same email apart', () => {
    expect(key(SECRET, 'login-email')).not.toBe(key(SECRET, 'reset-request-email'))
  })

  it('shows nothing of the email, and is not its plain SHA-256', () => {
    const stored = key(SECRET)

    expect(stored).not.toContain('ana')
    expect(stored).not.toContain('bytebank')
    expect(stored).not.toBe(createHash('sha256').update(`login-email:${EMAIL}`).digest('hex'))
  })
})
