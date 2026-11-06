import { createHash } from 'node:crypto'
import type { RateLimiter, RateLimitResult } from '@bytebank/core'
import { databaseError, invalidResponse, type SupabaseDatabase } from './database'

export interface PostgresRateLimiterOptions {
  // Separates the counters of different limits that may see the same key
  namespace: string
  maxHits: number
  windowMs: number
}

interface ConsumeRow {
  allowed: boolean
  retry_after_ms: number
}

function isConsumeRow(value: unknown): value is ConsumeRow {
  const row = value as Partial<ConsumeRow> | null
  return typeof row?.allowed === 'boolean' && typeof row.retry_after_ms === 'number'
}

// One counter per key in Postgres, shared by every app and instance: a block at the login of
// the shell also holds at the password change of the dashboard. A fixed window per key; the
// in-memory limiter slides, so its countdown can be a little shorter.
export class PostgresRateLimiter implements RateLimiter {
  private readonly namespace: string
  private readonly maxHits: number
  private readonly windowMs: number

  constructor(
    private readonly database: SupabaseDatabase,
    { namespace, maxHits, windowMs }: PostgresRateLimiterOptions,
  ) {
    this.namespace = namespace
    this.maxHits = maxHits
    this.windowMs = windowMs
  }

  async consume(key: string): Promise<RateLimitResult> {
    const { data, error, status } = await this.database.rpc('consume_rate_limit', {
      p_key: this.storedKey(key),
      p_max_hits: this.maxHits,
      p_window_ms: this.windowMs,
    })
    if (error) throw databaseError('consume rate limit', error, status)
    const row: unknown = Array.isArray(data) ? data[0] : data
    if (!isConsumeRow(row)) throw invalidResponse('consume rate limit')
    return row.allowed ? { allowed: true } : { allowed: false, retryAfterMs: Math.max(row.retry_after_ms, 1) }
  }

  async release(key: string): Promise<void> {
    const { error, status } = await this.database.rpc('release_rate_limit', { p_key: this.storedKey(key) })
    if (error) throw databaseError('release rate limit', error, status)
  }

  async reset(key: string): Promise<void> {
    const { error, status } = await this.database.from('rate_limits').delete().eq('key', this.storedKey(key))
    if (error) throw databaseError('reset rate limit', error, status)
  }

  // A hash, so no email or IP is stored in the table
  storedKey(key: string): string {
    return createHash('sha256').update(`${this.namespace}:${key}`).digest('hex')
  }
}
