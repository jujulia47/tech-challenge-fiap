import type { PasswordHasher } from '../application/ports/PasswordHasher'

// Records what it verified, so that tests can prove both failures do the same work
export class FakePasswordHasher implements PasswordHasher {
  readonly verified: string[] = []

  async hash(password: string): Promise<string> {
    return `hashed:${password}`
  }

  async verify(password: string, hash: string): Promise<boolean> {
    this.verified.push(hash)
    return hash === `hashed:${password}`
  }
}
