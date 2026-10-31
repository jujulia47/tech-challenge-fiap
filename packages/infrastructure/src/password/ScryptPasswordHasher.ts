import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import type { PasswordHasher } from '@bytebank/core'

// OWASP minimum for scrypt: N = 2^17, r = 8, p = 1, which needs 128 * N * r = 128 MiB per hash.
// scripts/hash-password.mjs must produce this same format. See docs/fase4/security.md.
const DEFAULT_COST = { N: 2 ** 17, r: 8, p: 1 }
const SALT_BYTES = 16
const KEY_BYTES = 32
// Parameters are read from the stored hash, so a damaged one must not ask for gigabytes
const MAX_MEMORY_BYTES = 256 * 1024 * 1024
const FORMAT = /^scrypt\$N=(\d+),r=(\d+),p=(\d+)\$([\w-]+)\$([\w-]+)$/

type Cost = typeof DEFAULT_COST

function derive(password: string, salt: Buffer, keyBytes: number, { N, r, p }: Cost): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyBytes, { N, r, p, maxmem: 2 * MAX_MEMORY_BYTES }, (error, key) =>
      error ? reject(error) : resolve(key),
    )
  })
}

function isUsableCost({ N, r, p }: Cost): boolean {
  return N > 1 && Number.isInteger(Math.log2(N)) && r > 0 && p > 0 && 128 * N * r * p <= MAX_MEMORY_BYTES
}

export class ScryptPasswordHasher implements PasswordHasher {
  constructor(private readonly cost: Cost = DEFAULT_COST) {}

  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES)
    const key = await derive(password, salt, KEY_BYTES, this.cost)
    const { N, r, p } = this.cost
    return `scrypt$N=${N},r=${r},p=${p}$${salt.toString('base64url')}$${key.toString('base64url')}`
  }

  async verify(password: string, hash: string): Promise<boolean> {
    const match = FORMAT.exec(hash)
    if (!match) return false
    const cost = { N: Number(match[1]), r: Number(match[2]), p: Number(match[3]) }
    if (!isUsableCost(cost)) return false

    const expected = Buffer.from(match[5], 'base64url')
    if (expected.length === 0) return false
    const actual = await derive(password, Buffer.from(match[4], 'base64url'), expected.length, cost)
    return timingSafeEqual(actual, expected)
  }
}
