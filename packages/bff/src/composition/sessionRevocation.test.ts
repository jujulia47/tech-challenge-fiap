import { User } from '@bytebank/core'
import { InMemoryUserRepository } from '@bytebank/core/testing'
import { describe, expect, it } from 'vitest'
import { createSessionRevocation } from './sessionRevocation'

const LOGIN = 1_700_000_000_000
const user = () => User.create({ id: 'u1', name: 'Joana', email: 'joana@exemplo.com', passwordHash: 'hash' })

describe('createSessionRevocation', () => {
  it('accepts a session until the user ends them, then refuses every session that started before', async () => {
    const users = new InMemoryUserRepository([user()])
    const sessions = createSessionRevocation(users, () => LOGIN + 1_000)

    await expect(sessions.isValid('u1', LOGIN)).resolves.toBe(true)
    await sessions.endAll('u1')

    expect((await users.findById('u1'))?.sessionsValidAfter).toBe(LOGIN + 1_000)
    await expect(sessions.isValid('u1', LOGIN)).resolves.toBe(false)
    await expect(sessions.isValid('u1', LOGIN + 2_000)).resolves.toBe(true)
  })

  it('reads the user on every check, so a logout made by another app holds at once', async () => {
    const users = new InMemoryUserRepository([user()])
    const here = createSessionRevocation(users)
    const elsewhere = createSessionRevocation(users, () => LOGIN + 1_000)

    await expect(here.isValid('u1', LOGIN)).resolves.toBe(true)
    await elsewhere.endAll('u1')
    await expect(here.isValid('u1', LOGIN)).resolves.toBe(false)
  })
})
