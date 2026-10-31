import { describe, expect, it } from 'vitest'
import { CryptoResetTokenGenerator } from './CryptoResetTokenGenerator'

const generator = new CryptoResetTokenGenerator()

describe('CryptoResetTokenGenerator', () => {
  it('generates 32 random bytes for a URL', () => {
    const { token } = generator.generate()

    expect(Buffer.from(token, 'base64url')).toHaveLength(32)
    expect(token).toMatch(/^[\w-]{43}$/)
  })

  it('generates a different token each time', () => {
    expect(generator.generate().token).not.toBe(generator.generate().token)
  })

  it('gives the SHA-256 of the token, which is not the token', () => {
    const { token, tokenHash } = generator.generate()

    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/)
    expect(tokenHash).toBe(generator.hash(token))
    expect(tokenHash).not.toContain(token)
  })
})
