import { AuthenticateUser, User } from '@bytebank/core'
import { FakePasswordHasher, InMemoryUserRepository } from '@bytebank/core/testing'
import { InMemoryRateLimiter } from '@bytebank/infrastructure'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const WINDOW_MS = 15 * 60_000
const known = User.create({ id: '1', name: 'Ana', email: 'ana@bytebank.com', passwordHash: 'hashed:right' })

function setup() {
  return new AuthenticateUser(new InMemoryUserRepository([known]), new FakePasswordHasher(), {
    byEmail: new InMemoryRateLimiter({ maxHits: 5, windowMs: WINDOW_MS }),
    byIp: new InMemoryRateLimiter({ maxHits: 20, windowMs: WINDOW_MS }),
  })
}

async function failuresThenBlock(useCase: AuthenticateUser, email: string): Promise<unknown> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await useCase.execute({ email, password: 'wrong' }).catch(() => undefined)
    vi.advanceTimersByTime(1_000)
  }
  return useCase.execute({ email, password: 'wrong' }).catch((error: unknown) => error)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('login limit, with the real limiter', () => {
  it('gives the same countdown for an email that exists and one that does not', async () => {
    const useCase = setup()

    const existing = await failuresThenBlock(useCase, 'ana@bytebank.com')
    const unknown = await failuresThenBlock(useCase, 'nobody@bytebank.com')

    expect(existing).toMatchObject({ code: 'RATE_LIMITED', retryAfterMs: WINDOW_MS - 5_000 })
    expect(unknown).toEqual(existing)
  })

  it('counts the email as typed, whatever its case', async () => {
    const useCase = setup()

    await failuresThenBlock(useCase, 'ANA@bytebank.com')

    await expect(useCase.execute({ email: 'ana@bytebank.com', password: 'right' })).rejects.toMatchObject({
      code: 'RATE_LIMITED',
    })
  })

  it('lets the right password in when the wait ends', async () => {
    const useCase = setup()

    const blocked = (await failuresThenBlock(useCase, 'ana@bytebank.com')) as { retryAfterMs: number }
    vi.advanceTimersByTime(blocked.retryAfterMs)

    await expect(useCase.execute({ email: 'ana@bytebank.com', password: 'right' })).resolves.toMatchObject({ id: '1' })
  })
})
