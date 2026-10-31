import type { ResetTokenGenerator } from '../application/ports/PasswordResetTokens'

export class FakeResetTokenGenerator implements ResetTokenGenerator {
  private current = 0

  generate(): { token: string; tokenHash: string } {
    this.current += 1
    const token = `token-${this.current}`
    return { token, tokenHash: this.hash(token) }
  }

  hash(token: string): string {
    return `hash-of:${token}`
  }
}
