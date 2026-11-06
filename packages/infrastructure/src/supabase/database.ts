import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { InfrastructureError } from '../errors/InfrastructureError'
import { DEFAULT_TIMEOUT_MS } from '../json-server/http'

export type SupabaseDatabase = SupabaseClient

interface SupabaseFailure {
  code?: string
  message?: string
}

// Postgres: a unique index refused the row
export const UNIQUE_VIOLATION = '23505'

// Only the database: no session and no Supabase Auth, because the login is ours.
// The secret key bypasses RLS, so this must only ever run on the server.
export function createSupabaseDatabase(url: string, secretKey: string, timeoutMs = DEFAULT_TIMEOUT_MS): SupabaseDatabase {
  return createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: {
      fetch: (input, init) => fetch(input, { ...init, signal: init?.signal ?? AbortSignal.timeout(timeoutMs) }),
    },
  })
}

// The message and the details of Postgres can quote the values of a row, such as an email,
// and errors reach the server log. Only the operation, the status and the code go in.
export function databaseError(operation: string, error: SupabaseFailure, status: number): InfrastructureError {
  const message = error.message ?? ''
  if (status === 0) {
    const timedOut = /abort|timeout/i.test(message)
    return new InfrastructureError(`The database did not answer: ${operation}`, {
      code: timedOut ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_UNREACHABLE',
    })
  }
  const code = error.code ? `, code ${error.code}` : ''
  return new InfrastructureError(`Database request failed: ${operation} (status ${status}${code})`, {
    code: 'UPSTREAM_BAD_STATUS',
    status,
  })
}

export function invalidResponse(operation: string): InfrastructureError {
  return new InfrastructureError(`The database answered in an unexpected format: ${operation}`, {
    code: 'UPSTREAM_INVALID_RESPONSE',
  })
}
