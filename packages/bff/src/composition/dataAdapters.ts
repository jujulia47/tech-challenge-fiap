import type {
  PasswordResetTokenRepository,
  RateLimiter,
  TransactionRepository,
  TransactionStatistics,
  UserRepository,
} from '@bytebank/core'
import {
  HttpPasswordResetTokenRepository,
  HttpTransactionRepository,
  HttpTransactionStatistics,
  HttpUserRepository,
  InMemoryRateLimiter,
  PostgresRateLimiter,
  SupabasePasswordResetTokenRepository,
  SupabaseTransactionRepository,
  SupabaseTransactionStatistics,
  SupabaseUserRepository,
  createSupabaseDatabase,
} from '@bytebank/infrastructure'

export type DataBackend = 'json-server' | 'supabase'

const BACKENDS: readonly DataBackend[] = ['json-server', 'supabase']

type Env = Record<string, string | undefined>

export interface RateLimitOptions {
  maxHits: number
  windowMs: number
}

// The adapters of one backend. Transactions come raw: the encryption of the attachments
// wraps them in the composition, the same way for both backends.
export interface DataAdapters {
  backend: DataBackend
  users: UserRepository
  transactions: TransactionRepository
  resetTokens: PasswordResetTokenRepository
  // Numbers of the whole bank, for the public page /sobre
  statistics: TransactionStatistics
  // The namespace separates the counters in Postgres; in memory every limiter is its own anyway
  rateLimiter(namespace: string, options: RateLimitOptions): RateLimiter
}

function isBackend(value: string): value is DataBackend {
  return BACKENDS.some(backend => backend === value)
}

export function readDataBackend(env: Env = process.env): DataBackend {
  const value = env.DATA_BACKEND?.trim() || 'json-server'
  if (!isBackend(value)) throw new Error(`DATA_BACKEND must be "json-server" or "supabase", got "${value}"`)
  return value
}

function required(env: Env, name: string, reason: string): string {
  const value = env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name} (${reason})`)
  return value
}

export function createJsonServerAdapters(baseUrl: string): DataAdapters {
  return {
    backend: 'json-server',
    users: new HttpUserRepository(baseUrl),
    transactions: new HttpTransactionRepository(baseUrl),
    resetTokens: new HttpPasswordResetTokenRepository(baseUrl),
    statistics: new HttpTransactionStatistics(baseUrl),
    rateLimiter: (_namespace, options) => new InMemoryRateLimiter(options),
  }
}

export function createSupabaseAdapters(url: string, secretKey: string): DataAdapters {
  const database = createSupabaseDatabase(url, secretKey)
  return {
    backend: 'supabase',
    users: new SupabaseUserRepository(database),
    transactions: new SupabaseTransactionRepository(database),
    resetTokens: new SupabasePasswordResetTokenRepository(database),
    statistics: new SupabaseTransactionStatistics(database),
    rateLimiter: (namespace, options) => new PostgresRateLimiter(database, { namespace, ...options }),
  }
}

// Read on demand, never at import time: `next build` loads the routes without these variables.
// Server only: the secret key bypasses RLS, and nothing here is imported by a screen.
export function createDataAdapters(env: Env = process.env): DataAdapters {
  if (readDataBackend(env) === 'supabase') {
    const reason = 'DATA_BACKEND is supabase'
    return createSupabaseAdapters(required(env, 'SUPABASE_URL', reason), required(env, 'SUPABASE_SECRET_KEY', reason))
  }
  return createJsonServerAdapters(required(env, 'JSON_SERVER_URL', 'DATA_BACKEND is json-server'))
}
