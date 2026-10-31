import { describe, expect, it, vi } from 'vitest'
import { User } from '../../domain/user/User'
import { FakePasswordHasher } from '../../testing/FakePasswordHasher'
import { FakeRateLimiter } from '../../testing/FakeRateLimiter'
import { InMemoryUserRepository } from '../../testing/InMemoryUserRepository'
import type { UserRepository } from '../ports/UserRepository'
import { AuthenticateUser } from './AuthenticateUser'

const user = User.create({ id: '1', name: 'Ana', email: 'ana@bytebank.com', passwordHash: 'hashed:right' })

function setup({ byEmail = new FakeRateLimiter(), byIp = new FakeRateLimiter() } = {}) {
  const hasher = new FakePasswordHasher()
  const users: UserRepository = new InMemoryUserRepository([user])
  return { hasher, byEmail, byIp, useCase: new AuthenticateUser(users, hasher, { byEmail, byIp }) }
}

const failure = (promise: Promise<unknown>) => promise.catch((error: unknown) => error)

describe('AuthenticateUser', () => {
  it('returns the user, with no password hash', async () => {
    const result = await setup().useCase.execute({ email: 'ana@bytebank.com', password: 'right' })

    expect(result).toEqual({ id: '1', name: 'Ana', email: 'ana@bytebank.com' })
  })

  it('finds the user whatever the case and the spaces of the email', async () => {
    const result = await setup().useCase.execute({ email: '  ANA@bytebank.com ', password: 'right' })

    expect(result.id).toBe('1')
  })

  it('compares in NFKC, as new passwords are hashed', async () => {
    const hasher = new FakePasswordHasher()
    const composed = User.create({ ...user.toRecord(), passwordHash: 'hashed:ﬁ'.normalize('NFKC') })
    const limiters = { byEmail: new FakeRateLimiter(), byIp: new FakeRateLimiter() }
    const useCase = new AuthenticateUser(new InMemoryUserRepository([composed]), hasher, limiters)

    await expect(useCase.execute({ email: 'ana@bytebank.com', password: 'ﬁ' })).resolves.toMatchObject({ id: '1' })
  })

  it('fails the same way for a wrong password and an unknown email', async () => {
    const { useCase } = setup()

    const wrongPassword = await failure(useCase.execute({ email: 'ana@bytebank.com', password: 'wrong' }))
    const unknownEmail = await failure(useCase.execute({ email: 'nobody@bytebank.com', password: 'wrong' }))

    expect(wrongPassword).toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect(unknownEmail).toMatchObject({ code: 'INVALID_CREDENTIALS' })
    expect((wrongPassword as Error).message).toBe((unknownEmail as Error).message)
  })

  it('verifies a hash even when the user does not exist, which spends the same time', async () => {
    const { hasher, useCase } = setup()

    await failure(useCase.execute({ email: 'nobody@bytebank.com', password: 'wrong' }))

    expect(hasher.verified).toHaveLength(1)
    expect(hasher.verified[0]).toMatch(/^hashed:/)
  })

  it('does not let the decoy password in', async () => {
    const { useCase } = setup()

    const error = await failure(
      useCase.execute({ email: 'nobody@bytebank.com', password: 'decoy-password-that-belongs-to-nobody' }),
    )

    expect(error).toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })

  describe('rate limit', () => {
    const input = { email: 'ANA@bytebank.com', password: 'wrong', ip: '10.0.0.1' }

    it('counts the normalized email and the IP before the slow work', async () => {
      const { byEmail, byIp, useCase } = setup()

      await failure(useCase.execute(input))

      expect(byEmail.consumed).toEqual(['ana@bytebank.com'])
      expect(byIp.consumed).toEqual(['10.0.0.1'])
    })

    it('keeps a failure counted', async () => {
      const { byEmail, byIp, useCase } = setup()

      await failure(useCase.execute(input))

      expect(byEmail.released).toEqual([])
      expect(byIp.released).toEqual([])
    })

    it('gives the attempt back on a success', async () => {
      const { byEmail, byIp, useCase } = setup()

      await useCase.execute({ ...input, password: 'right' })

      expect(byEmail.released).toEqual(['ana@bytebank.com'])
      expect(byIp.released).toEqual(['10.0.0.1'])
    })

    it.each([
      ['email', { byEmail: new FakeRateLimiter(0) }],
      ['IP', { byIp: new FakeRateLimiter(0) }],
    ])('blocked by %s: refuses the right password, without the hasher, and says how long', async (_, limiters) => {
      const { hasher, useCase } = setup(limiters)

      const blocked = await failure(useCase.execute({ ...input, password: 'right' }))

      expect(hasher.verified).toEqual([])
      expect(blocked).toMatchObject({ code: 'RATE_LIMITED', retryAfterMs: 60_000 })
    })

    it('blocks without looking the email up, so the block cannot depend on it', async () => {
      const users = new InMemoryUserRepository([user])
      const findByEmail = vi.spyOn(users, 'findByEmail')
      const limiters = { byEmail: new FakeRateLimiter(0), byIp: new FakeRateLimiter() }
      const useCase = new AuthenticateUser(users, new FakePasswordHasher(), limiters)

      await failure(useCase.execute(input))

      expect(findByEmail).not.toHaveBeenCalled()
    })

    it('does not count the email when the IP is already blocked', async () => {
      const byEmail = new FakeRateLimiter()
      const { useCase } = setup({ byEmail, byIp: new FakeRateLimiter(0) })

      await failure(useCase.execute(input))

      expect(byEmail.consumed).toEqual([])
    })

    it('works without an IP, counting the email only', async () => {
      const { byEmail, byIp, useCase } = setup()

      await useCase.execute({ email: 'ana@bytebank.com', password: 'right' })

      expect(byIp.consumed).toEqual([])
      expect(byIp.released).toEqual([])
      expect(byEmail.released).toEqual(['ana@bytebank.com'])
    })

    it('gives the attempt back when the backend fails', async () => {
      const byEmail = new FakeRateLimiter()
      const byIp = new FakeRateLimiter()
      const broken: UserRepository = {
        findByEmail: () => Promise.reject(new Error('backend down')),
        findById: () => Promise.resolve(null),
        updatePasswordHash: () => Promise.resolve(),
        create: user => Promise.resolve(user),
      }
      const useCase = new AuthenticateUser(broken, new FakePasswordHasher(), { byEmail, byIp })

      await expect(useCase.execute(input)).rejects.toThrow('backend down')

      expect(byEmail.released).toEqual(['ana@bytebank.com'])
      expect(byIp.released).toEqual(['10.0.0.1'])
    })
  })
})
