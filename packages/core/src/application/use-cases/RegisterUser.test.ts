import { describe, expect, it } from 'vitest'
import { User } from '../../domain/user/User'
import { FakeCommonPasswordList } from '../../testing/FakeCommonPasswordList'
import { FakePasswordHasher } from '../../testing/FakePasswordHasher'
import { FakeRateLimiter } from '../../testing/FakeRateLimiter'
import { SequentialIdGenerator } from '../../testing/fakes'
import { InMemoryUserRepository } from '../../testing/InMemoryUserRepository'
import { RegisterUser } from './RegisterUser'

const input = { name: 'Ana', email: 'Ana@Bytebank.com', password: 'correct horse battery staple' }
const existing = User.create({ id: '1', name: 'Ana', email: 'ana@bytebank.com', passwordHash: 'x' })

function setup(initial: User[] = [], limiter = new FakeRateLimiter()) {
  const users = new InMemoryUserRepository(initial)
  const hasher = new FakePasswordHasher()
  const commonPasswords = new FakeCommonPasswordList(['commonpasswordlistedhere'])
  return { users, useCase: new RegisterUser(users, hasher, new SequentialIdGenerator(), limiter, commonPasswords) }
}

describe('RegisterUser', () => {
  it('returns the user, with no password hash', async () => {
    await expect(setup().useCase.execute(input)).resolves.toEqual({ id: 'id-1', name: 'Ana', email: 'ana@bytebank.com' })
  })

  it('stores the hash, never the password', async () => {
    const { users, useCase } = setup()

    await useCase.execute(input)

    const stored = await users.findByEmail('ana@bytebank.com')
    expect(stored?.toRecord()).toEqual({
      id: 'id-1',
      name: 'Ana',
      email: 'ana@bytebank.com',
      passwordHash: 'hashed:correct horse battery staple',
    })
  })

  it('refuses an email already registered, in any case', async () => {
    await expect(setup([existing]).useCase.execute(input)).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' })
  })

  it('does not replace the user already registered', async () => {
    const { users, useCase } = setup([existing])

    await useCase.execute(input).catch(() => undefined)

    expect((await users.findByEmail('ana@bytebank.com'))?.passwordHash).toBe('x')
  })

  it('counts the attempts of an IP', async () => {
    const limiter = new FakeRateLimiter()

    await setup([], limiter).useCase.execute({ ...input, ip: '10.0.0.1' })

    expect(limiter.consumed).toEqual(['10.0.0.1'])
  })

  it('refuses an IP over the limit, and stores nothing', async () => {
    const { users, useCase } = setup([], new FakeRateLimiter(0))

    await expect(useCase.execute({ ...input, ip: '10.0.0.1' })).rejects.toMatchObject({ code: 'RATE_LIMITED' })

    await expect(users.findByEmail('ana@bytebank.com')).resolves.toBeNull()
  })

  it.each([
    ['too short', 'curta', 'PASSWORD_TOO_SHORT'],
    ['on the list, in any case or spacing', 'Common Password Listed Here', 'PASSWORD_TOO_COMMON'],
    ['with a word of the bank', 'minha senha do bytebank longa', 'PASSWORD_HAS_PERSONAL_CONTEXT'],
    ['with the name of the person', 'a senha da ana bem comprida', 'PASSWORD_HAS_PERSONAL_CONTEXT'],
  ])('refuses a password %s, and stores nothing', async (_, password, code) => {
    const { users, useCase } = setup()

    await expect(useCase.execute({ ...input, password })).rejects.toMatchObject({ code })

    await expect(users.findByEmail('ana@bytebank.com')).resolves.toBeNull()
  })

  it('hashes the password in NFKC, spaces and Unicode included', async () => {
    const { users, useCase } = setup()

    await useCase.execute({ ...input, password: 'uma ﬁla de café com açaí' })

    const stored = await users.findByEmail('ana@bytebank.com')
    expect(stored?.passwordHash).toBe('hashed:uma fila de café com açaí'.normalize('NFKC'))
  })

  it.each([
    ['a blank name', { ...input, name: ' ' }, 'USER_INVALID_NAME'],
    ['an invalid email', { ...input, email: 'no-at-sign' }, 'USER_INVALID_EMAIL'],
  ])('refuses %s', async (_, data, code) => {
    await expect(setup().useCase.execute(data)).rejects.toMatchObject({ code })
  })
})
