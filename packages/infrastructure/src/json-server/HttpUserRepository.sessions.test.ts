import { User } from '@bytebank/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpUserRepository } from './HttpUserRepository'

const record = { id: '1', name: 'Ana', email: 'ana@bytebank.com', passwordHash: 'hash' }
const ENDED = Date.UTC(2026, 10, 14, 15, 30, 12, 345)
const fetchMock = vi.fn<typeof fetch>()
const repository = new HttpUserRepository('http://api.test')

const respondWith = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

// db.json keeps the moment as an ISO date and time, so it can be read by a person
describe('HttpUserRepository and the end of the sessions', () => {
  it('reads the ISO moment as milliseconds', async () => {
    respondWith({ ...record, sessionsValidAfter: '2026-11-14T15:30:12.345Z' })

    expect((await repository.findById('1'))?.sessionsValidAfter).toBe(ENDED)
  })

  it('reads a user with no moment as one who never ended their sessions', async () => {
    respondWith(record)

    expect((await repository.findById('1'))?.sessionsValidAfter).toBeUndefined()
  })

  it.each(['not a date', 42])('refuses a stored moment that is not a date (%s) as corrupted', async value => {
    respondWith({ ...record, sessionsValidAfter: value })

    await expect(repository.findById('1')).rejects.toMatchObject({ code: 'CORRUPTED_RECORD' })
  })

  it('writes only that field, as ISO, with one PATCH', async () => {
    respondWith({})

    await repository.updateSessionsValidAfter('1', ENDED)

    expect(String(fetchMock.mock.calls[0][0])).toBe('http://api.test/users/1')
    expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: '{"sessionsValidAfter":"2026-11-14T15:30:12.345Z"}' })
  })

  it('stores a new user with the moment as ISO, and with none when there is none', async () => {
    respondWith(record)
    await repository.create(User.create(record))
    respondWith(record)
    await repository.create(User.create({ ...record, sessionsValidAfter: ENDED }))

    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual(record)
    expect(JSON.parse(String(fetchMock.mock.calls[1][1]?.body))).toEqual({ ...record, sessionsValidAfter: '2026-11-14T15:30:12.345Z' })
  })
})
