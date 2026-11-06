import type { RateLimiter } from '@bytebank/core'
import { describe, expect, it } from 'vitest'

const TIMEOUT = { timeout: 20_000 }

export function describeRateLimiterContract(name: string, limiter: (maxHits: number) => RateLimiter, key: () => string): void {
  describe(`RateLimiter contract: ${name}`, TIMEOUT, () => {
    it('allows up to the limit, then blocks with the time left in the window', async () => {
      const subject = limiter(3)
      const k = key()
      for (let attempt = 0; attempt < 3; attempt += 1) await expect(subject.consume(k)).resolves.toEqual({ allowed: true })

      const blocked = await subject.consume(k)

      expect(blocked.allowed).toBe(false)
      if (!blocked.allowed) expect(blocked.retryAfterMs).toBeGreaterThan(0)
      if (!blocked.allowed) expect(blocked.retryAfterMs).toBeLessThanOrEqual(60_000)
    })

    it('gives an attempt back on release, and forgets all on reset', async () => {
      const subject = limiter(2)
      const k = key()
      await subject.consume(k)
      await subject.consume(k)
      await subject.release(k)

      await expect(subject.consume(k)).resolves.toEqual({ allowed: true })
      await subject.reset(k)
      await expect(subject.consume(k)).resolves.toEqual({ allowed: true })
    })

    it('counts each key apart', async () => {
      const subject = limiter(1)
      const [first, second] = [key(), key()]
      await subject.consume(first)

      await expect(subject.consume(second)).resolves.toEqual({ allowed: true })
    })

    it('lets exactly the limit through when attempts arrive together', async () => {
      const subject = limiter(3)
      const k = key()

      const results = await Promise.all(Array.from({ length: 8 }, () => subject.consume(k)))

      expect(results.filter(result => result.allowed)).toHaveLength(3)
    })
  })
}
