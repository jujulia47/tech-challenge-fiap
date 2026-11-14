import { describe, expect, it } from 'vitest'
import { ChangePassword } from '../../application/use-cases/ChangePassword'
import { EndUserSessions } from '../../application/use-cases/EndUserSessions'
import { ResetPassword } from '../../application/use-cases/ResetPassword'
import { VerifySession } from '../../application/use-cases/VerifySession'
import { FakeCommonPasswordList } from '../../testing/FakeCommonPasswordList'
import { FakePasswordHasher } from '../../testing/FakePasswordHasher'
import { FakeRateLimiter } from '../../testing/FakeRateLimiter'
import { FakeResetTokenGenerator } from '../../testing/FakeResetTokenGenerator'
import { InMemoryPasswordResetTokenRepository } from '../../testing/InMemoryPasswordResetTokenRepository'
import { InMemoryUserRepository } from '../../testing/InMemoryUserRepository'
import { isSessionRevoked } from './sessionRevocation'
import { User } from './User'

const LOGIN = 1_700_000_000_000
const LOGOUT = LOGIN + 60_000
const CURRENT = 'senha atual bem longa'
const NEW = 'outra senha nova e longa'

const user = (sessionsValidAfter?: number) =>
  User.create({ id: 'u1', name: 'Joana', email: 'joana@exemplo.com', passwordHash: `hashed:${CURRENT}`, sessionsValidAfter })

describe('isSessionRevoked', () => {
  it('accepts every session while the user never ended them', () => {
    expect(isSessionRevoked(LOGIN, undefined)).toBe(false)
    expect(isSessionRevoked(undefined, undefined)).toBe(false)
  })

  it('refuses a session that started before the sessions ended', () => {
    expect(isSessionRevoked(LOGOUT - 1, LOGOUT)).toBe(true)
  })

  it('accepts a session that started at that moment or after it', () => {
    expect(isSessionRevoked(LOGOUT, LOGOUT)).toBe(false)
    expect(isSessionRevoked(LOGOUT + 1, LOGOUT)).toBe(false)
  })

  it('refuses a session with no recorded start once the user ended their sessions', () => {
    expect(isSessionRevoked(undefined, LOGOUT)).toBe(true)
  })
})

describe('User.sessionsValidAfter', () => {
  it('is kept, and absent by default', () => {
    expect(user(LOGOUT).sessionsValidAfter).toBe(LOGOUT)
    expect(user().sessionsValidAfter).toBeUndefined()
    expect('sessionsValidAfter' in user().toRecord()).toBe(false)
  })

  it.each([Number.NaN, -1, 1.5, Number.POSITIVE_INFINITY])('refuses %s as an instant', value => {
    expect(() => user(value)).toThrow(expect.objectContaining({ code: 'USER_INVALID_SESSIONS_VALID_AFTER' }))
  })
})

describe('EndUserSessions and VerifySession', () => {
  function setup() {
    const users = new InMemoryUserRepository([user()])
    return { users, end: new EndUserSessions(users, () => LOGOUT), verify: new VerifySession(users) }
  }

  it('accepts a session before any logout', async () => {
    const { verify } = setup()
    await expect(verify.execute({ userId: 'u1', sessionStartedAt: LOGIN })).resolves.toBe(true)
  })

  it('a logout refuses every session that started before it, and accepts a new login', async () => {
    const { end, verify, users } = setup()

    await end.execute({ userId: 'u1' })

    expect((await users.findById('u1'))?.sessionsValidAfter).toBe(LOGOUT)
    await expect(verify.execute({ userId: 'u1', sessionStartedAt: LOGIN })).resolves.toBe(false)
    await expect(verify.execute({ userId: 'u1', sessionStartedAt: undefined })).resolves.toBe(false)
    await expect(verify.execute({ userId: 'u1', sessionStartedAt: LOGOUT + 5_000 })).resolves.toBe(true)
  })

  it('refuses the session of a user that no longer exists', async () => {
    const { verify } = setup()
    await expect(verify.execute({ userId: 'gone', sessionStartedAt: LOGIN })).resolves.toBe(false)
  })
})

describe('a new password ends every session', () => {
  it('ChangePassword records the moment, after saving the hash', async () => {
    const users = new InMemoryUserRepository([user()])
    const changePassword = new ChangePassword({
      users,
      hasher: new FakePasswordHasher(),
      commonPasswords: new FakeCommonPasswordList(),
      limiterByEmail: new FakeRateLimiter(),
      now: () => LOGOUT,
    })

    await changePassword.execute({ userId: 'u1', currentPassword: CURRENT, newPassword: NEW })

    const stored = await users.findById('u1')
    expect(stored?.passwordHash).toBe(`hashed:${NEW}`)
    expect(stored?.sessionsValidAfter).toBe(LOGOUT)
    await expect(new VerifySession(users).execute({ userId: 'u1', sessionStartedAt: LOGIN })).resolves.toBe(false)
  })

  it('a refused change keeps the sessions', async () => {
    const users = new InMemoryUserRepository([user()])
    const changePassword = new ChangePassword({
      users,
      hasher: new FakePasswordHasher(),
      commonPasswords: new FakeCommonPasswordList(),
      limiterByEmail: new FakeRateLimiter(),
      now: () => LOGOUT,
    })

    await expect(changePassword.execute({ userId: 'u1', currentPassword: 'senha errada e longa', newPassword: NEW }))
      .rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' })
    expect((await users.findById('u1'))?.sessionsValidAfter).toBeUndefined()
  })

  it('ResetPassword records the moment too', async () => {
    const users = new InMemoryUserRepository([user()])
    const tokens = new InMemoryPasswordResetTokenRepository()
    const generator = new FakeResetTokenGenerator()
    const { token, tokenHash } = generator.generate()
    await tokens.create({ userId: 'u1', tokenHash, expiresAt: LOGOUT + 60_000, used: false })
    const reset = new ResetPassword({
      users,
      tokens,
      generator,
      hasher: new FakePasswordHasher(),
      commonPasswords: new FakeCommonPasswordList(),
      loginLimiterByEmail: new FakeRateLimiter(),
      now: () => LOGOUT,
    })

    await reset.execute({ token, password: NEW })

    expect((await users.findById('u1'))?.sessionsValidAfter).toBe(LOGOUT)
  })
})
