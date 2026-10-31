import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InMemoryRateLimiter } from './InMemoryRateLimiter'

const MINUTE = 60_000

const allows = async (limiter: InMemoryRateLimiter, key: string) => (await limiter.consume(key)).allowed

async function consumeTimes(limiter: InMemoryRateLimiter, key: string, times: number): Promise<boolean[]> {
  const results: boolean[] = []
  for (let index = 0; index < times; index += 1) results.push(await allows(limiter, key))
  return results
}

describe('InMemoryRateLimiter', () => {
  let limiter: InMemoryRateLimiter

  beforeEach(() => {
    vi.useFakeTimers()
    limiter = new InMemoryRateLimiter({ maxHits: 5, windowMs: 15 * MINUTE })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('allows 5 attempts and blocks the 6th', async () => {
    expect(await consumeTimes(limiter, 'a', 6)).toEqual([true, true, true, true, true, false])
  })

  it('stays blocked until the window ends', async () => {
    await consumeTimes(limiter, 'a', 5)

    vi.advanceTimersByTime(15 * MINUTE - 1)
    await expect(allows(limiter, 'a')).resolves.toBe(false)
  })

  it('allows again after the window', async () => {
    await consumeTimes(limiter, 'a', 5)

    vi.advanceTimersByTime(15 * MINUTE)

    expect(await consumeTimes(limiter, 'a', 6)).toEqual([true, true, true, true, true, false])
  })

  it('slides: only the attempts inside the window count', async () => {
    await consumeTimes(limiter, 'a', 4)
    vi.advanceTimersByTime(10 * MINUTE)
    await allows(limiter, 'a')
    vi.advanceTimersByTime(5 * MINUTE)

    expect(await consumeTimes(limiter, 'a', 5)).toEqual([true, true, true, true, false])
  })

  it('says how long is left, until the oldest attempt leaves the window', async () => {
    await limiter.consume('a')
    vi.advanceTimersByTime(MINUTE)
    await consumeTimes(limiter, 'a', 4)
    vi.advanceTimersByTime(MINUTE)

    await expect(limiter.consume('a')).resolves.toEqual({ allowed: false, retryAfterMs: 13 * MINUTE })
  })

  it('does not extend the block with refused attempts', async () => {
    await consumeTimes(limiter, 'a', 5)
    vi.advanceTimersByTime(14 * MINUTE)
    await consumeTimes(limiter, 'a', 20)
    vi.advanceTimersByTime(MINUTE)

    await expect(allows(limiter, 'a')).resolves.toBe(true)
  })

  it('separates the keys, so one email or IP does not block another', async () => {
    await consumeTimes(limiter, 'ana@bytebank.com', 6)

    await expect(allows(limiter, 'bia@bytebank.com')).resolves.toBe(true)
    await expect(allows(limiter, '10.0.0.1')).resolves.toBe(true)
  })

  it('gives back an attempt', async () => {
    await consumeTimes(limiter, 'a', 5)

    await limiter.release('a')

    await expect(allows(limiter, 'a')).resolves.toBe(true)
    await expect(allows(limiter, 'a')).resolves.toBe(false)
  })

  it('forgets every attempt of a key on reset, and only of that key', async () => {
    await consumeTimes(limiter, 'a', 5)
    await consumeTimes(limiter, 'b', 5)

    await limiter.reset('a')

    await expect(allows(limiter, 'a')).resolves.toBe(true)
    await expect(allows(limiter, 'b')).resolves.toBe(false)
  })

  it('ignores the release of an unknown key', async () => {
    await expect(limiter.release('nobody')).resolves.toBeUndefined()
  })

  it('keeps counting a key that had an attempt given back', async () => {
    await limiter.consume('a')
    await limiter.release('a')

    expect(await consumeTimes(limiter, 'a', 6)).toEqual([true, true, true, true, true, false])
  })

  describe('memory', () => {
    it('drops expired keys first', async () => {
      const small = new InMemoryRateLimiter({ maxHits: 1, windowMs: MINUTE, maxKeys: 2 })
      await small.consume('old')
      vi.advanceTimersByTime(30_000)
      await small.consume('recent')
      vi.advanceTimersByTime(30_000)

      await small.consume('new')

      await expect(allows(small, 'recent')).resolves.toBe(false)
    })

    it('drops the oldest key when all are still valid', async () => {
      const small = new InMemoryRateLimiter({ maxHits: 1, windowMs: MINUTE, maxKeys: 2 })
      await small.consume('first')
      await small.consume('second')

      await small.consume('third')

      await expect(allows(small, 'first')).resolves.toBe(true)
    })
  })
})
