import { afterEach, describe, expect, it, vi } from 'vitest'
import { authLogger } from './authLogger'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('authLogger', () => {
  it('logs the name and the message, and nothing the error carries', () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const expired = Object.assign(new Error('"exp" claim timestamp check failed', {
      cause: { payload: { email: 'ana@bytebank.com' } },
    }), { name: 'JWTExpired', payload: { email: 'ana@bytebank.com' } })

    authLogger.error(expired)

    expect(log.mock.calls).toEqual([['[auth] JWTExpired: "exp" claim timestamp check failed']])
  })
})
