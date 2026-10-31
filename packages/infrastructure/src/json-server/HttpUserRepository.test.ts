import { User } from '@bytebank/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpUserRepository } from './HttpUserRepository'

const BASE_URL = 'http://api.test'
const record = { id: '1', name: 'Ana', email: 'ana@bytebank.com', passwordHash: 'hash' }
const fetchMock = vi.fn<typeof fetch>()
const repository = new HttpUserRepository(`${BASE_URL}/`)

const respondWith = (body: unknown, status = 200) =>
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HttpUserRepository', () => {
  describe('findByEmail', () => {
    it('filters with _where and returns the user', async () => {
      respondWith([record])

      const user = await repository.findByEmail('ana@bytebank.com')

      const url = new URL(String(fetchMock.mock.calls[0][0]))
      expect(url.pathname).toBe('/users')
      expect(JSON.parse(String(url.searchParams.get('_where')))).toEqual({ email: { eq: 'ana@bytebank.com' } })
      expect(user?.toRecord()).toEqual(record)
    })

    it('returns null when there is no user', async () => {
      respondWith([])

      await expect(repository.findByEmail('ana@bytebank.com')).resolves.toBeNull()
    })

    it('ignores other users even if the server ignores the filter', async () => {
      respondWith([{ ...record, email: 'other@bytebank.com' }, null])

      await expect(repository.findByEmail('ana@bytebank.com')).resolves.toBeNull()
    })

    describe('keeps the email out of the errors, which reach the log', () => {
      const email = 'ana@bytebank.com'
      const expectNoEmail = (error: Error & { url?: string }) => {
        const text = [error.message, error.url, String(error.cause)].join(' ')
        expect(text).toContain('/users')
        expect(text).not.toMatch(/ana|bytebank\.com|_where/)
      }

      it.each<[string, () => void]>([
        ['a bad status', () => respondWith({}, 500)],
        ['a body that is not a list', () => respondWith({})],
        ['a body that is not JSON', () => fetchMock.mockResolvedValueOnce(new Response('oops'))],
        ['an unreachable backend', () => fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'))],
        [
          'a timeout',
          () => fetchMock.mockRejectedValueOnce(Object.assign(new Error('late'), { name: 'TimeoutError' })),
        ],
      ])('on %s', async (_, arrange) => {
        arrange()

        expectNoEmail(await repository.findByEmail(email).catch((error: Error) => error) as Error)
      })
    })

    it('rejects a response that is not a list', async () => {
      respondWith({})

      await expect(repository.findByEmail('a@b.co')).rejects.toMatchObject({ code: 'UPSTREAM_INVALID_RESPONSE' })
    })

    it('rejects a non-2xx response', async () => {
      respondWith({}, 500)

      await expect(repository.findByEmail('a@b.co')).rejects.toMatchObject({ code: 'UPSTREAM_BAD_STATUS' })
    })

    it.each([
      ['a user with a plain-text password', { id: '1', name: 'Ana', email: 'ana@bytebank.com', password: 'x' }],
      ['a user the domain rejects', { ...record, name: ' ' }],
    ])('reports %s as corrupted, with its id', async (_, stored) => {
      respondWith([stored])

      await expect(repository.findByEmail('ana@bytebank.com')).rejects.toMatchObject({
        code: 'CORRUPTED_RECORD',
        message: 'Stored user is invalid: 1',
      })
    })
  })

  describe('findById', () => {
    it('reads the user', async () => {
      respondWith(record)

      const user = await repository.findById('1')

      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/users/1`)
      expect(user?.email).toBe('ana@bytebank.com')
    })

    it('answers null for 404', async () => {
      respondWith({}, 404)

      await expect(repository.findById('1')).resolves.toBeNull()
    })

    it('rejects another failure', async () => {
      respondWith({}, 500)

      await expect(repository.findById('1')).rejects.toMatchObject({ code: 'UPSTREAM_BAD_STATUS' })
    })
  })

  describe('updatePasswordHash', () => {
    it('changes only the hash', async () => {
      respondWith(record)

      await repository.updatePasswordHash('1', 'new-hash')

      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/users/1`)
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: '{"passwordHash":"new-hash"}' })
    })

    it('rejects a failure', async () => {
      respondWith({}, 500)

      await expect(repository.updatePasswordHash('1', 'x')).rejects.toMatchObject({ status: 500 })
    })
  })

  describe('create', () => {
    it('posts the record and returns what the server stored', async () => {
      respondWith({ ...record, id: 'server-id' }, 201)

      const created = await repository.create(User.create(record))

      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/users`)
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(record) })
      expect(created.id).toBe('server-id')
    })

    it('reports a stored value that is not a user', async () => {
      respondWith(null, 201)

      await expect(repository.create(User.create(record))).rejects.toMatchObject({ code: 'CORRUPTED_RECORD' })
    })

    it('rejects a non-2xx response', async () => {
      respondWith({}, 500)

      await expect(repository.create(User.create(record))).rejects.toMatchObject({ status: 500 })
    })
  })
})
