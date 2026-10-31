import type { RateLimiter, RateLimitResult } from '../application/ports/RateLimiter'

// Allows the given number of attempts and records the keys
export class FakeRateLimiter implements RateLimiter {
  readonly consumed: string[] = []
  readonly released: string[] = []
  readonly resetKeys: string[] = []

  constructor(
    private remaining = Number.POSITIVE_INFINITY,
    private readonly retryAfterMs = 60_000,
  ) {}

  async consume(key: string): Promise<RateLimitResult> {
    if (this.remaining <= 0) return { allowed: false, retryAfterMs: this.retryAfterMs }
    this.remaining -= 1
    this.consumed.push(key)
    return { allowed: true }
  }

  async release(key: string): Promise<void> {
    this.released.push(key)
  }

  async reset(key: string): Promise<void> {
    this.resetKeys.push(key)
  }
}
