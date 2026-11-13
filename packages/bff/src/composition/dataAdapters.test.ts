import {
  HttpTransactionRepository,
  HttpUserRepository,
  InMemoryRateLimiter,
  PostgresRateLimiter,
  SupabasePasswordResetTokenRepository,
  SupabaseTransactionRepository,
  SupabaseUserRepository,
} from '@bytebank/infrastructure'
import { describe, expect, it } from 'vitest'
import { createDataAdapters, readDataBackend } from './dataAdapters'

const SUPABASE = {
  DATA_BACKEND: 'supabase',
  SUPABASE_URL: 'https://project.supabase.test',
  SUPABASE_SECRET_KEY: 'sb_secret_test',
  NEXTAUTH_SECRET: btoa('n'.repeat(32)),
}
const LIMIT = { maxHits: 5, windowMs: 60_000 }

describe('readDataBackend', () => {
  it('is json-server when nothing is set, so local development needs nothing new', () => {
    expect(readDataBackend({})).toBe('json-server')
    expect(readDataBackend({ DATA_BACKEND: ' ' })).toBe('json-server')
  })

  it('reads supabase', () => {
    expect(readDataBackend({ DATA_BACKEND: 'supabase' })).toBe('supabase')
  })

  it('refuses any other value, instead of falling back without saying', () => {
    expect(() => readDataBackend({ DATA_BACKEND: 'postgres' })).toThrow('DATA_BACKEND must be "json-server" or "supabase", got "postgres"')
  })
})

describe('createDataAdapters', () => {
  it('uses json-server and the memory limiter by default', () => {
    const adapters = createDataAdapters({ JSON_SERVER_URL: 'http://json-server:3001' })

    expect(adapters.backend).toBe('json-server')
    expect(adapters.users).toBeInstanceOf(HttpUserRepository)
    expect(adapters.transactions).toBeInstanceOf(HttpTransactionRepository)
    expect(adapters.rateLimiter('login-email', LIMIT)).toBeInstanceOf(InMemoryRateLimiter)
  })

  it('uses Supabase for every port, with the limiter in Postgres', () => {
    const adapters = createDataAdapters(SUPABASE)

    expect(adapters.backend).toBe('supabase')
    expect(adapters.users).toBeInstanceOf(SupabaseUserRepository)
    expect(adapters.transactions).toBeInstanceOf(SupabaseTransactionRepository)
    expect(adapters.resetTokens).toBeInstanceOf(SupabasePasswordResetTokenRepository)
    expect(adapters.rateLimiter('login-email', LIMIT)).toBeInstanceOf(PostgresRateLimiter)
  })

  it('keeps two limits apart in Postgres, and the same namespace shared', () => {
    const adapters = createDataAdapters(SUPABASE)
    const key = (namespace: string) => (adapters.rateLimiter(namespace, LIMIT) as PostgresRateLimiter).storedKey('ana@bytebank.com')

    expect(key('login-email')).toBe(key('login-email'))
    expect(key('login-email')).not.toBe(key('register-ip'))
    expect(key('login-email')).toMatch(/^[0-9a-f]{64}$/)
    expect(key('login-email')).not.toContain('ana')
  })

  it('derives the keys of the limits from NEXTAUTH_SECRET: another secret, other keys', () => {
    const key = (env: typeof SUPABASE) => (createDataAdapters(env).rateLimiter('login-email', LIMIT) as PostgresRateLimiter).storedKey('ana@bytebank.com')

    expect(key(SUPABASE)).not.toBe(key({ ...SUPABASE, NEXTAUTH_SECRET: btoa('m'.repeat(32)) }))
  })

  it('says clearly when NEXTAUTH_SECRET is missing, which the keys of the limits need', () => {
    expect(() => createDataAdapters({ ...SUPABASE, NEXTAUTH_SECRET: '' })).toThrow(
      'Missing required environment variable: NEXTAUTH_SECRET (the keys of the rate limits)',
    )
  })

  it.each(['SUPABASE_URL', 'SUPABASE_SECRET_KEY'])('says clearly when %s is missing', name => {
    const env = { ...SUPABASE, [name]: '' }

    expect(() => createDataAdapters(env)).toThrow(`Missing required environment variable: ${name} (DATA_BACKEND is supabase)`)
  })

  it('needs no Supabase variable with json-server', () => {
    expect(() => createDataAdapters({ DATA_BACKEND: 'json-server', JSON_SERVER_URL: 'http://json-server:3001' })).not.toThrow()
  })
})
