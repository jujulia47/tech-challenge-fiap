import { ChangePassword, UpdateUserProfile, User } from '@bytebank/core'
import { FakeCommonPasswordList, FakePasswordHasher, FakeRateLimiter, InMemoryUserRepository } from '@bytebank/core/testing'
import { describe, expect, it, vi } from 'vitest'
import { createAccountHandlers } from './createAccountHandlers'

const ORIGIN = 'http://bff.test'
const CURRENT = 'cavalo bateria grampo coração'
const NEW = 'girassol trovoada caneca violeta'

function setup(userId: string | null = 'u1') {
  const users = new InMemoryUserRepository([
    User.create({ id: 'u1', name: 'Joana Silva', email: 'joana@exemplo.com', passwordHash: `hashed:${CURRENT}` }),
    User.create({ id: 'u2', name: 'Outra Pessoa', email: 'outra@exemplo.com', passwordHash: `hashed:${CURRENT}` }),
  ])
  const logger = { error: vi.fn() }
  const getUserId = vi.fn(async () => userId)
  const handlers = createAccountHandlers({
    getUserId,
    updateUserProfile: new UpdateUserProfile(users),
    changePassword: new ChangePassword({
      users,
      hasher: new FakePasswordHasher(),
      commonPasswords: new FakeCommonPasswordList(),
      limiterByEmail: new FakeRateLimiter(),
    }),
    allowedOrigins: [ORIGIN],
    logger,
  })
  return { users, handlers, logger, getUserId }
}

const request = (method: 'PATCH' | 'POST', value: unknown, headers: Record<string, string> = { Origin: ORIGIN }) =>
  new Request('http://bff.test/api/account', { method, headers, body: JSON.stringify(value) })

const nameOf = async (users: InMemoryUserRepository, id: string) => (await users.findById(id))?.name

describe('createAccountHandlers', () => {
  describe('the profile', () => {
    it('saves the name of the user of the session and answers only the name', async () => {
      const { users, handlers } = setup()

      const response = await handlers.updateProfile(request('PATCH', { name: '  Joana Souza ' }))

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ name: 'Joana Souza' })
      expect(await nameOf(users, 'u1')).toBe('Joana Souza')
      expect(response.headers.get('Cache-Control')).toBe('no-store')
    })

    it.each([
      ['an empty name', { name: '   ' }],
      ['a name over 100 characters', { name: 'a'.repeat(101) }],
      ['no name', {}],
      ['an id in the body', { name: 'Joana', userId: 'u2' }],
      ['the email in the body', { name: 'Joana', email: 'outra@exemplo.com' }],
    ])('refuses %s with 400, without the value received', async (_, body) => {
      const { users, handlers } = setup()

      const response = await handlers.updateProfile(request('PATCH', body))
      const text = await response.text()

      expect(response.status).toBe(400)
      expect(JSON.parse(text)).toMatchObject({ error: 'VALIDATION_ERROR' })
      expect(text).not.toContain('u2')
      expect(text).not.toContain('outra@exemplo.com')
      expect(await nameOf(users, 'u2')).toBe('Outra Pessoa')
    })
  })

  describe('the password', () => {
    it('changes it and answers 204', async () => {
      const { users, handlers } = setup()

      const response = await handlers.changePassword(request('POST', { currentPassword: CURRENT, newPassword: NEW }))

      expect(response.status).toBe(204)
      expect((await users.findById('u1'))?.passwordHash).toBe(`hashed:${NEW}`)
    })

    it.each([
      ['a wrong current password', { currentPassword: 'outra senha qualquer longa', newPassword: NEW }, 'INVALID_CURRENT_PASSWORD'],
      ['a weak new password', { currentPassword: CURRENT, newPassword: 'curta7' }, 'PASSWORD_TOO_SHORT'],
      ['the same password', { currentPassword: CURRENT, newPassword: CURRENT }, 'PASSWORD_UNCHANGED'],
    ])('refuses %s with 422 and only a code, never 401', async (_, body, code) => {
      const { handlers } = setup()

      const response = await handlers.changePassword(request('POST', body))

      expect(response.status).toBe(422)
      expect(await response.json()).toEqual({ error: code })
    })

    it('refuses an unknown field', async () => {
      const { handlers } = setup()

      const response = await handlers.changePassword(request('POST', { currentPassword: CURRENT, newPassword: NEW, userId: 'u2' }))

      expect(response.status).toBe(400)
    })
  })

  describe('before anything', () => {
    it.each(['updateProfile', 'changePassword'] as const)('%s refuses another origin before reading the session', async handler => {
      const { handlers, getUserId } = setup()

      const response = await handlers[handler](request('POST', { name: 'Joana' }, { Origin: 'http://evil.test' }))

      expect(response.status).toBe(403)
      expect(getUserId).not.toHaveBeenCalled()
    })

    it.each(['updateProfile', 'changePassword'] as const)('%s answers 401 with no session', async handler => {
      const { handlers } = setup(null)

      const response = await handlers[handler](request('POST', { name: 'Joana' }))

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'UNAUTHENTICATED' })
    })

    it('answers a backend failure with no internal detail', async () => {
      const { handlers, logger } = setup()
      const broken = createAccountHandlers({
        getUserId: async () => 'u1',
        updateUserProfile: { execute: () => Promise.reject(new Error('json-server at http://json-server:3001 is down')) },
        changePassword: { execute: () => Promise.resolve() },
        allowedOrigins: [ORIGIN],
        logger,
      })

      const response = await broken.updateProfile(request('PATCH', { name: 'Joana' }))

      expect(response.status).toBe(500)
      expect(await response.text()).toBe('{"error":"INTERNAL_ERROR"}')
      expect(logger.error).toHaveBeenCalledTimes(1)
      expect(handlers).toBeDefined()
    })
  })
})
