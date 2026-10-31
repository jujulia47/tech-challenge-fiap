import { RegisterUser } from '@bytebank/core'
import {
  FakeCommonPasswordList,
  FakePasswordHasher,
  FakeRateLimiter,
  InMemoryUserRepository,
  SequentialIdGenerator,
} from '@bytebank/core/testing'
import { InfrastructureError } from '@bytebank/infrastructure'
import { describe, expect, it, vi } from 'vitest'
import { createRegisterHandler } from './createRegisterHandler'

const ORIGIN = 'http://bff.test'
const body = { name: 'Ana', email: 'ana@bytebank.com', password: 'correct horse battery staple' }

function setup(limiter = new FakeRateLimiter()) {
  const users = new InMemoryUserRepository()
  const logger = { error: vi.fn() }
  const registerUser = new RegisterUser(
    users,
    new FakePasswordHasher(),
    new SequentialIdGenerator(),
    limiter,
    new FakeCommonPasswordList(),
  )
  return { users, logger, register: createRegisterHandler({ registerUser, allowedOrigins: [ORIGIN], logger }) }
}

const request = (value: unknown, headers: Record<string, string> = { Origin: ORIGIN }) =>
  new Request('http://bff.test/api/register', { method: 'POST', headers, body: JSON.stringify(value) })

describe('createRegisterHandler', () => {
  it('creates the user and answers 202 with no user in the body', async () => {
    const { users, register } = setup()

    const response = await register(request(body))

    expect(response.status).toBe(202)
    expect(await response.text()).toBe('{"status":"ACCEPTED"}')
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect((await users.findByEmail('ana@bytebank.com'))?.passwordHash).toBe('hashed:correct horse battery staple')
  })

  it('answers exactly the same for an email already registered', async () => {
    const { logger, register } = setup()
    await register(request(body))

    const response = await register(request({ ...body, password: 'another-password' }))

    expect(response.status).toBe(202)
    expect(await response.text()).toBe('{"status":"ACCEPTED"}')
    expect(logger.error).not.toHaveBeenCalled()
  })

  it.each([
    ['a strange Origin', { Origin: 'https://evil.example' }],
    ['no Origin', {}],
  ])('answers 403 for %s, with nothing read', async (_, headers) => {
    const { register } = setup()
    const forged = request(body, headers)

    const response = await register(forged)

    expect(response.status).toBe(403)
    expect(forged.bodyUsed).toBe(false)
  })

  it.each([
    ['an empty password', { ...body, password: '' }, 'password'],
    ['a password over the ceiling of the request', { ...body, password: 'x'.repeat(1025) }, 'password'],
    ['a blank name', { ...body, name: '   ' }, 'name'],
    ['a name too long', { ...body, name: 'x'.repeat(101) }, 'name'],
    ['an invalid email', { ...body, email: 'no-at-sign' }, 'email'],
    ['an extra field', { ...body, id: '1' }, 'body'],
  ])('answers 400 for %s, echoing nothing it received', async (_, value, field) => {
    const { register } = setup()

    const response = await register(request(value))
    const text = await response.text()

    expect(response.status).toBe(400)
    expect(JSON.parse(text).issues[0].field).toBe(field)
    expect(text).not.toContain('short')
    expect(text).not.toContain('no-at-sign')
  })

  it.each([
    ['short', 'short', 'PASSWORD_TOO_SHORT'],
    ['with the name of the bank', 'a senha do bytebank e bem longa', 'PASSWORD_HAS_PERSONAL_CONTEXT'],
  ])('answers 422 with the code for a password %s, the rule being in the domain', async (_, password, code) => {
    const { register } = setup()

    const response = await register(request({ ...body, password }))

    expect(response.status).toBe(422)
    expect(await response.text()).toBe(JSON.stringify({ error: code }))
  })

  it('limits by the IP of the request', async () => {
    const limiter = new FakeRateLimiter()
    const { register } = setup(limiter)

    await register(request(body, { Origin: ORIGIN, 'X-Forwarded-For': '10.0.0.1' }))

    expect(limiter.consumed).toEqual(['10.0.0.1'])
  })

  it('answers 429 over the limit', async () => {
    const { register } = setup(new FakeRateLimiter(0))

    const response = await register(request(body, { Origin: ORIGIN, 'X-Forwarded-For': '10.0.0.1' }))

    expect(response.status).toBe(429)
    expect(await response.text()).toBe('{"error":"RATE_LIMITED"}')
  })

  it('answers 400 for invalid JSON', async () => {
    const { register } = setup()

    const response = await register(
      new Request('http://bff.test', { method: 'POST', headers: { Origin: ORIGIN }, body: '{' }),
    )

    expect(response.status).toBe(400)
  })

  it('answers 502 without details when the backend fails, and works without a logger', async () => {
    const registerUser = { execute: vi.fn().mockRejectedValue(new InfrastructureError('internal detail')) }
    const register = createRegisterHandler({ registerUser, allowedOrigins: [ORIGIN] })

    const response = await register(request(body))

    expect(response.status).toBe(502)
    expect(await response.text()).toBe('{"error":"UPSTREAM_ERROR"}')
  })
})
