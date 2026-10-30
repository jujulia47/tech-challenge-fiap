import type { IdGenerator } from '@bytebank/core'

export class CryptoIdGenerator implements IdGenerator {
  next(): string {
    return crypto.randomUUID()
  }
}
