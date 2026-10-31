import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpPasswordResetTokenRepository } from './HttpPasswordResetTokenRepository'

const URL_BASE = 'http://api.test/passwordResetTokens'
const record = { id: '1', userId: 'u1', tokenHash: 'abc', expiresAt: 1000, used: false }
const fetchMock = vi.fn<typeof fetch>()
const repository = new HttpPasswordResetTokenRepository('http://api.test/')

const respondWith = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HttpPasswordResetTokenRepository', () => {
  it('posts a new token', async () => {
    respondWith(record, 201)
    const token = { userId: 'u1', tokenHash: 'abc', expiresAt: 1000, used: false }

    await repository.create(token)

    expect(fetchMock.mock.calls[0][0]).toBe(URL_BASE)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(token) })
  })

  it('finds by hash, whatever else the server answers', async () => {
    respondWith([{ ...record, tokenHash: 'other' }, record])

    await expect(repository.findByHash('abc')).resolves.toEqual(record)
  })

  it('answers null for an unknown hash', async () => {
    respondWith([])

    await expect(repository.findByHash('abc')).resolves.toBeNull()
  })

  it('marks one token as used', async () => {
    respondWith(record)

    await repository.markUsed('1')

    expect(fetchMock.mock.calls[0][0]).toBe(`${URL_BASE}/1`)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: '{"used":true}' })
  })

  it('invalidates only the open tokens of the user', async () => {
    respondWith([record, { ...record, id: '2', used: true }, { ...record, id: '3', userId: 'u2' }])
    respondWith(record)

    await repository.invalidateAllOfUser('u1')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1][0]).toBe(`${URL_BASE}/1`)
  })

  it('refuses a stored value that is not a token', async () => {
    respondWith([{ id: '1' }])

    await expect(repository.findByHash('abc')).rejects.toMatchObject({ code: 'UPSTREAM_INVALID_RESPONSE' })
  })

  it('keeps the hash out of the errors', async () => {
    respondWith({}, 500)

    const error = (await repository.findByHash('abc').catch((caught: unknown) => caught)) as Error & { url: string }

    expect(error.url).toBe(URL_BASE)
    expect(error.message).not.toContain('abc')
  })
})
