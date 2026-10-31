import type { RateLimiter, RateLimitResult } from '@bytebank/core'

const DEFAULT_MAX_KEYS = 10_000

export interface InMemoryRateLimiterOptions {
  maxHits: number
  windowMs: number
  maxKeys?: number
}

// A sliding window per key, in the memory of one process: every instance counts on its
// own and a restart forgets everything. See docs/fase4/security.md for production.
export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>()
  private readonly maxHits: number
  private readonly windowMs: number
  private readonly maxKeys: number

  constructor({ maxHits, windowMs, maxKeys = DEFAULT_MAX_KEYS }: InMemoryRateLimiterOptions) {
    this.maxHits = maxHits
    this.windowMs = windowMs
    this.maxKeys = maxKeys
  }

  async consume(key: string): Promise<RateLimitResult> {
    const now = Date.now()
    const recent = this.recentHits(key, now)
    const allowed = recent.length < this.maxHits
    if (allowed) recent.push(now)

    // Deleted first so that the Map stays ordered from the oldest key to the newest
    this.hits.delete(key)
    this.hits.set(key, recent)
    this.evict(now)
    // A slot opens when the oldest attempt leaves the window
    return allowed ? { allowed } : { allowed, retryAfterMs: recent[0] + this.windowMs - now }
  }

  async release(key: string): Promise<void> {
    const recent = this.hits.get(key)
    recent?.pop()
    if (recent?.length === 0) this.hits.delete(key)
  }

  async reset(key: string): Promise<void> {
    this.hits.delete(key)
  }

  private recentHits(key: string, now: number): number[] {
    return (this.hits.get(key) ?? []).filter(hit => now - hit < this.windowMs)
  }

  // Keys come from the outside, so memory must not grow with every invented email
  private evict(now: number): void {
    if (this.hits.size <= this.maxKeys) return
    for (const key of this.hits.keys()) {
      if (this.recentHits(key, now).length === 0) this.hits.delete(key)
    }
    for (const key of this.hits.keys()) {
      if (this.hits.size <= this.maxKeys) return
      this.hits.delete(key)
    }
  }
}
