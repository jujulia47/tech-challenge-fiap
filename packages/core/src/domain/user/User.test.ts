import { describe, expect, it } from 'vitest'
import { User, normalizeEmail } from './User'

const props = { id: '1', name: ' Ana ', email: ' ANA@bytebank.com ', passwordHash: 'hash' }

describe('User', () => {
  it('normalizes the name and the email', () => {
    expect(User.create(props).toDTO()).toEqual({ id: '1', name: 'Ana', email: 'ana@bytebank.com' })
  })

  it('leaves the hash out of the DTO', () => {
    expect(User.create(props).toDTO()).not.toHaveProperty('passwordHash')
  })

  it('keeps the hash in the record for the adapter', () => {
    const user = User.create(props)

    expect(user.id).toBe('1')
    expect(user.passwordHash).toBe('hash')
    expect(user.toRecord()).toEqual({ id: '1', name: 'Ana', email: 'ana@bytebank.com', passwordHash: 'hash' })
  })

  it.each([
    ['id', { ...props, id: ' ' }, 'USER_INVALID_ID'],
    ['name', { ...props, name: ' ' }, 'USER_INVALID_NAME'],
    ['name over 100 characters', { ...props, name: 'a'.repeat(101) }, 'USER_INVALID_NAME'],
    ['email', { ...props, email: 'a@b' }, 'USER_INVALID_EMAIL'],
    ['hash', { ...props, passwordHash: '' }, 'USER_INVALID_PASSWORD_HASH'],
  ])('rejects an invalid %s', (_, data, code) => {
    expect(() => User.create(data)).toThrow(expect.objectContaining({ code }))
  })

  it('normalizes an email alone', () => {
    expect(normalizeEmail(' A@B.com ')).toBe('a@b.com')
  })
})
