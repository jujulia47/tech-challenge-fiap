import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { User } from '@bytebank/core'
import { afterAll, beforeAll, describe } from 'vitest'
import { createSupabaseDatabase, type SupabaseDatabase } from '../supabase/database'
import { PostgresRateLimiter } from '../supabase/PostgresRateLimiter'
import { deriveRateLimitKey } from '../supabase/rateLimitKey'
import { SupabasePasswordResetTokenRepository } from '../supabase/SupabasePasswordResetTokenRepository'
import { SupabaseTransactionRepository } from '../supabase/SupabaseTransactionRepository'
import { SupabaseTransactionStatistics } from '../supabase/SupabaseTransactionStatistics'
import { SupabaseUserRepository } from '../supabase/SupabaseUserRepository'
import {
  describeResetTokenContract,
  describeTransactionRepositoryContract,
  describeUserRepositoryContract,
  type ContractContext,
} from './portContracts'
import { describeRateLimiterContract } from './rateLimiterContract'

// Against the real project: off by default and out of the CI.
// SUPABASE_CONTRACT_TESTS=1 npx vitest run supabase.contract   (reads .env of the root)
const ENABLED = process.env.SUPABASE_CONTRACT_TESTS === '1'
const ROOT_ENV = fileURLToPath(new URL('../../../../.env', import.meta.url))
if (ENABLED && !process.env.SUPABASE_URL && existsSync(ROOT_ENV)) process.loadEnvFile(ROOT_ENV)

// Everything this run creates starts with this, and is deleted at the end
const RUN = `contract-${randomUUID().slice(0, 8)}`
const CAPABILITIES = { uniqueEmail: true, atomicClaim: true }

let database: SupabaseDatabase | undefined
let context: ContractContext | undefined
const limiterKeys: string[] = []
let sequence = 0

beforeAll(async () => {
  if (!ENABLED) return
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are needed for the Supabase contract tests')
  database = createSupabaseDatabase(url, key, 15_000)
  const users = new SupabaseUserRepository(database)
  const owners = { a: `${RUN}-owner-a`, b: `${RUN}-owner-b` }
  // Transactions and tokens need a user that exists (foreign key)
  for (const id of Object.values(owners)) {
    await users.create(User.create({ id, name: 'Contrato Dono', email: `${id}@bytebank.test`, passwordHash: 'hash-of-test' }))
  }
  context = {
    users,
    transactions: new SupabaseTransactionRepository(database),
    resetTokens: new SupabasePasswordResetTokenRepository(database),
    statistics: new SupabaseTransactionStatistics(database),
    id: label => `${RUN}-${label}-${(sequence += 1)}`,
    owners: () => owners,
  }
}, 30_000)

afterAll(async () => {
  if (!database) return
  // Users last would be enough (on delete cascade), but each table is cleaned on its own
  // so that a failed cascade does not leave data behind
  await database.from('transactions').delete().like('user_id', `${RUN}-%`)
  await database.from('password_reset_tokens').delete().like('user_id', `${RUN}-%`)
  await database.from('users').delete().like('id', `${RUN}-%`)
  if (limiterKeys.length > 0) await database.from('rate_limits').delete().in('key', limiterKeys)
}, 30_000)

const ready = (): ContractContext => {
  if (!context) throw new Error('Supabase is not ready')
  return context
}

describe.skipIf(!ENABLED)('Supabase', () => {
  describeUserRepositoryContract('Supabase', ready, CAPABILITIES)
  describeTransactionRepositoryContract('Supabase', ready)
  describeResetTokenContract('Supabase', ready, CAPABILITIES)
  describeRateLimiterContract(
    'Postgres',
    maxHits => {
      if (!database) throw new Error('Supabase is not ready')
      // The HMAC key, from a secret made for this run
      const keySecret = deriveRateLimitKey(`${RUN}-secret`)
      const limiter = new PostgresRateLimiter(database, { namespace: `${RUN}-limits`, maxHits, windowMs: 60_000, keySecret })
      // Kept so the rows can be deleted at the end
      const consume = limiter.consume.bind(limiter)
      limiter.consume = async key => {
        limiterKeys.push(limiter.storedKey(key))
        return consume(key)
      }
      return limiter
    },
    () => `${RUN}-key-${(sequence += 1)}`,
  )
})
