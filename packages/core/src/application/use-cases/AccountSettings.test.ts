import { describe, expect, it } from 'vitest'
import { User } from '../../domain/user/User'
import { FakeCommonPasswordList } from '../../testing/FakeCommonPasswordList'
import { FakePasswordHasher } from '../../testing/FakePasswordHasher'
import { FakeRateLimiter } from '../../testing/FakeRateLimiter'
import { InMemoryUserRepository } from '../../testing/InMemoryUserRepository'
import { ChangePassword } from './ChangePassword'
import { UpdateUserProfile } from './UpdateUserProfile'

const CURRENT = 'cavalo bateria grampo coração'
const NEW = 'girassol trovoada caneca violeta'
const user = () => User.create({ id: 'u1', name: 'Joana Silva', email: 'joana@exemplo.com', passwordHash: `hashed:${CURRENT}` })

describe('UpdateUserProfile', () => {
  it('saves the new name, trimmed, and returns the user without the hash', async () => {
    const users = new InMemoryUserRepository([user()])

    const result = await new UpdateUserProfile(users).execute({ userId: 'u1', name: '  Joana Souza  ' })

    expect(result).toEqual({ id: 'u1', name: 'Joana Souza', email: 'joana@exemplo.com' })
    expect((await users.findById('u1'))?.name).toBe('Joana Souza')
  })

  it.each([
    ['empty', ''],
    ['only spaces', '   '],
    ['over 100 characters', 'a'.repeat(101)],
  ])('refuses a name that is %s, and keeps the old one', async (_, name) => {
    const users = new InMemoryUserRepository([user()])

    await expect(new UpdateUserProfile(users).execute({ userId: 'u1', name })).rejects.toMatchObject({ code: 'USER_INVALID_NAME' })
    expect((await users.findById('u1'))?.name).toBe('Joana Silva')
  })

  it('accepts exactly 100 characters, counted as characters', async () => {
    const name = '🙂'.repeat(100)

    const result = await new UpdateUserProfile(new InMemoryUserRepository([user()])).execute({ userId: 'u1', name })

    expect(result.name).toBe(name)
  })

  it('answers like a failed login for a user that no longer exists', async () => {
    await expect(new UpdateUserProfile(new InMemoryUserRepository()).execute({ userId: 'u1', name: 'Joana' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })
})

describe('ChangePassword', () => {
  function setup(attempts = Number.POSITIVE_INFINITY) {
    const users = new InMemoryUserRepository([user()])
    const hasher = new FakePasswordHasher()
    const limiterByEmail = new FakeRateLimiter(attempts)
    const useCase = new ChangePassword({ users, hasher, commonPasswords: new FakeCommonPasswordList(), limiterByEmail })
    const storedHash = async () => (await users.findById('u1'))?.passwordHash
    return { useCase, hasher, limiterByEmail, storedHash }
  }

  it('saves the hash of the new password', async () => {
    const { useCase, storedHash, limiterByEmail } = setup()

    await useCase.execute({ userId: 'u1', currentPassword: CURRENT, newPassword: NEW })

    expect(await storedHash()).toBe(`hashed:${NEW}`)
    expect(limiterByEmail.released).toEqual(['joana@exemplo.com'])
  })

  it('refuses a wrong current password, counts the attempt and changes nothing', async () => {
    const { useCase, storedHash, limiterByEmail } = setup()

    await expect(useCase.execute({ userId: 'u1', currentPassword: 'outra senha qualquer longa', newPassword: NEW }))
      .rejects.toMatchObject({ code: 'INVALID_CURRENT_PASSWORD' })
    expect(await storedHash()).toBe(`hashed:${CURRENT}`)
    expect(limiterByEmail.consumed).toEqual(['joana@exemplo.com'])
    expect(limiterByEmail.released).toEqual([])
  })

  it('verifies the current password with the hasher', async () => {
    const { useCase, hasher } = setup()

    await useCase.execute({ userId: 'u1', currentPassword: CURRENT, newPassword: NEW })

    expect(hasher.verified).toEqual([`hashed:${CURRENT}`])
  })

  it('blocks after the attempts of the login are used up, before checking anything', async () => {
    const { useCase, hasher } = setup(0)

    await expect(useCase.execute({ userId: 'u1', currentPassword: CURRENT, newPassword: NEW }))
      .rejects.toMatchObject({ code: 'RATE_LIMITED' })
    expect(hasher.verified).toEqual([])
  })

  it.each([
    ['too short', 'curta demais'],
    ['with the name of the user', 'joana silva e uma senha longa'],
  ])('refuses a weak new password: %s', async (_, newPassword) => {
    const { useCase, storedHash } = setup()

    await expect(useCase.execute({ userId: 'u1', currentPassword: CURRENT, newPassword })).rejects.toHaveProperty('code')
    expect(await storedHash()).toBe(`hashed:${CURRENT}`)
  })

  it('refuses a new password equal to the current one, even in another Unicode form', async () => {
    const { useCase } = setup()

    await expect(useCase.execute({ userId: 'u1', currentPassword: CURRENT, newPassword: CURRENT.normalize('NFD') }))
      .rejects.toMatchObject({ code: 'PASSWORD_UNCHANGED' })
  })

  it('answers like a failed login for a user that no longer exists', async () => {
    const { useCase } = setup()

    await expect(useCase.execute({ userId: 'nobody', currentPassword: CURRENT, newPassword: NEW }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })
  })
})
