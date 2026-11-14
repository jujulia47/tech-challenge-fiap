import type { NextAuthConfig } from 'next-auth'
import { describe, expect, it, vi } from 'vitest'
import { baseAuthConfig, type SessionChecks } from './sessionConfig'

type Callbacks = NonNullable<NextAuthConfig['callbacks']>
type JwtArgs = Parameters<NonNullable<Callbacks['jwt']>>[0]

const LOGIN = 1_700_000_000_000
const user = { id: '1', name: 'Joana Silva', email: 'joana@exemplo.com' }

// A store with one user, who ended their sessions at `endedAt` (or never)
function store(endedAt?: number) {
  const checks: SessionChecks = {
    isValid: vi.fn(async (_userId: string, startedAt: number | undefined) =>
      endedAt === undefined || (startedAt !== undefined && startedAt >= endedAt)),
  }
  return checks
}

const jwtOf = (sessions: SessionChecks, now = () => LOGIN) => baseAuthConfig({}, { sessions: () => sessions, now }).callbacks?.jwt

describe('the jwt callback and the revocation of sessions', () => {
  it('records when the session started, at the login, and checks nothing then', async () => {
    const sessions = store(LOGIN + 1)
    const token = await jwtOf(sessions)?.({ token: {}, user } as unknown as JwtArgs)

    expect(token).toMatchObject({ ...user, sessionStartedAt: LOGIN })
    expect(sessions.isValid).not.toHaveBeenCalled()
  })

  it('keeps a session that started after the user last ended their sessions', async () => {
    const sessions = store(LOGIN - 1)
    const token = { ...user, sessionStartedAt: LOGIN }

    expect(await jwtOf(sessions)?.({ token } as unknown as JwtArgs)).toEqual(token)
    expect(sessions.isValid).toHaveBeenCalledWith('1', LOGIN)
  })

  it('answers no session for a token that started before: Auth.js then clears the cookie', async () => {
    const sessions = store(LOGIN + 1)

    expect(await jwtOf(sessions)?.({ token: { ...user, sessionStartedAt: LOGIN } } as unknown as JwtArgs)).toBeNull()
  })

  it('refuses a token from before this rule, with no start, once the user ended their sessions', async () => {
    const sessions = store(LOGIN)

    expect(await jwtOf(sessions)?.({ token: { ...user } } as unknown as JwtArgs)).toBeNull()
    expect(sessions.isValid).toHaveBeenCalledWith('1', undefined)
  })

  it('checks before a refresh of the name, which a revoked session does not get', async () => {
    const sessions = store(LOGIN + 1)
    const refreshUser = vi.fn(async () => ({ name: 'Outro' }))
    const jwt = baseAuthConfig({}, { sessions: () => sessions, refreshUser }).callbacks?.jwt

    expect(await jwt?.({ token: { ...user, sessionStartedAt: LOGIN }, trigger: 'update' } as unknown as JwtArgs)).toBeNull()
    expect(refreshUser).not.toHaveBeenCalled()
  })

  it('lets a failure of the store through, so Auth.js fails closed and clears the session', async () => {
    const sessions: SessionChecks = { isValid: async () => { throw new Error('database down') } }

    await expect(jwtOf(sessions)?.({ token: { ...user, sessionStartedAt: LOGIN } } as unknown as JwtArgs)).rejects.toThrow('database down')
  })
})

describe('the sign-out of Auth.js', () => {
  it('ends only this browser: it has no event that ends the other sessions', () => {
    // "Sair" ends them through POST /api/sessions/end of the shell; the inactivity logout does not
    expect(baseAuthConfig({}, { sessions: () => store() }).events?.signOut).toBeUndefined()
  })
})
