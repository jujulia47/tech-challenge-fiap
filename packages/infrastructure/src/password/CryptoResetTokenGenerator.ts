import { createHash, randomBytes } from 'node:crypto'
import type { ResetTokenGenerator } from '@bytebank/core'

const TOKEN_BYTES = 32

// SHA-256 and not scrypt: a token has 256 random bits, so there is nothing to guess slowly
export class CryptoResetTokenGenerator implements ResetTokenGenerator {
  generate(): { token: string; tokenHash: string } {
    const token = randomBytes(TOKEN_BYTES).toString('base64url')
    return { token, tokenHash: this.hash(token) }
  }

  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex')
  }
}
