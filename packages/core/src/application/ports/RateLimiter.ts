export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterMs: number }

export interface RateLimiter {
  // Counts one attempt and answers whether it may go on. Counting comes before the slow work,
  // so that parallel attempts cannot all pass the check. A refused attempt is not counted.
  consume(key: string): Promise<RateLimitResult>
  // Gives back the last attempt, when it turned out not to be a failure
  release(key: string): Promise<void>
  // Forgets every attempt of the key
  reset(key: string): Promise<void>
}
