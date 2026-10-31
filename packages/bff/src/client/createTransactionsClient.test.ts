import { readFileSync } from 'node:fs'
import { createTransactionsClient as fromSubpath } from '@bytebank/bff/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as bff from '../index'
import { TransactionsApiError, createTransactionsClient } from './createTransactionsClient'

const transaction = {
  id: '1',
  userId: 'user-a',
  type: 'deposit',
  amountInCents: 100,
  date: '2026-03-01',
} as const

const fetchMock = vi.fn<typeof fetch>()
const location = { href: 'http://localhost:3000/transactions' }
const client = createTransactionsClient('/transactions')

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
}

const lastCall = () => fetchMock.mock.calls.at(-1) ?? []
const lastBody = () => JSON.parse(String(lastCall()[1]?.body)) as unknown

beforeEach(() => {
  fetchMock.mockReset()
  location.href = 'http://localhost:3000/transactions'
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('window', { location })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createTransactionsClient', () => {
  describe('requests', () => {
    it('lists with a GET and returns the DTOs', async () => {
      respondWith([transaction])

      await expect(client.fetchTransactions()).resolves.toEqual([transaction])
      expect(lastCall()).toEqual(['/transactions/api/transactions', undefined])
    })

    it('creates with a POST of the body as JSON', async () => {
      respondWith(transaction, 201)
      const data = { type: 'deposit', amountInCents: 100, date: '2026-03-01' } as const

      await expect(client.createTransaction(data)).resolves.toEqual(transaction)
      expect(lastCall()[0]).toBe('/transactions/api/transactions')
      expect(lastCall()[1]).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } })
      expect(lastBody()).toEqual(data)
    })

    it('updates with a PATCH of only the changes', async () => {
      respondWith(transaction)
      const changes = { type: 'payment', amountInCents: 200 } as const

      await expect(client.updateTransaction('1', changes)).resolves.toEqual(transaction)
      expect(lastCall()[0]).toBe('/transactions/api/transactions/1')
      expect(lastCall()[1]).toMatchObject({ method: 'PATCH', headers: { 'Content-Type': 'application/json' } })
      expect(lastBody()).toEqual(changes)
    })

    it('deletes with a DELETE and does not read the empty body of the 204', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

      await expect(client.deleteTransaction('1')).resolves.toBeUndefined()
      expect(lastCall()).toEqual(['/transactions/api/transactions/1', { method: 'DELETE' }])
    })

    it.each([
      ['updateTransaction', () => client.updateTransaction('a/b', { type: 'deposit', amountInCents: 1 })],
      ['deleteTransaction', () => client.deleteTransaction('a/b')],
    ])('%s encodes the id', async (_, call) => {
      respondWith(transaction)

      await call()

      expect(lastCall()[0]).toBe('/transactions/api/transactions/a%2Fb')
    })

    it('reads the balance', async () => {
      respondWith({ amountInCents: 115000 })

      await expect(client.fetchBalance()).resolves.toEqual({ amountInCents: 115000 })
      expect(lastCall()).toEqual(['/transactions/api/balance', undefined])
    })

    it('reads the statement', async () => {
      respondWith({ groups: [] })

      await expect(client.fetchStatement()).resolves.toEqual({ groups: [] })
      expect(lastCall()).toEqual(['/transactions/api/statement', undefined])
    })

    it.each([
      [{ period: 3 }, 'period=3'],
      [{ period: 6 }, 'period=6'],
      [{ period: 'all' }, 'period=all'],
      [{ period: 'all', type: 'doc_ted' }, 'period=all&type=doc_ted'],
    ] as const)('reads the chart data for %j', async (filters, query) => {
      respondWith({ byMonth: [], byType: [] })

      await expect(client.fetchChartData(filters)).resolves.toEqual({ byMonth: [], byType: [] })
      expect(lastCall()).toEqual([`/transactions/api/chart-data?${query}`, undefined])
    })
  })

  it('uses the basePath of each zone', async () => {
    respondWith([])
    respondWith({ amountInCents: 0 })
    const dashboard = createTransactionsClient('/dashboard')

    await dashboard.fetchTransactions()
    expect(lastCall()[0]).toBe('/dashboard/api/transactions')
    await dashboard.fetchBalance()
    expect(lastCall()[0]).toBe('/dashboard/api/balance')
  })

  describe('401', () => {
    it('sends the browser to the root of the shell', async () => {
      respondWith({ error: 'UNAUTHENTICATED' }, 401)

      await client.fetchTransactions().catch(() => undefined)

      expect(location.href).toBe('/')
    })

    it('also throws, so nothing goes on as if the request had worked', async () => {
      respondWith({ error: 'UNAUTHENTICATED' }, 401)

      await expect(client.fetchTransactions()).rejects.toMatchObject({ code: 'UNAUTHENTICATED' })
    })
  })

  describe('other errors', () => {
    it.each([
      [400, 'VALIDATION_ERROR'],
      [403, 'FORBIDDEN_ORIGIN'],
      [404, 'TRANSACTION_NOT_FOUND'],
      [413, 'PAYLOAD_TOO_LARGE'],
      [422, 'TRANSACTION_DATE_IN_FUTURE'],
      [500, 'INTERNAL_ERROR'],
      [502, 'UPSTREAM_ERROR'],
    ])('a %i throws the code %s and does not redirect', async (status, code) => {
      respondWith({ error: code }, status)

      const error = await client.fetchTransactions().catch((e: unknown) => e)

      expect(error).toBeInstanceOf(TransactionsApiError)
      expect(error).toMatchObject({ name: 'TransactionsApiError', code, message: code })
      expect(location.href).toBe('http://localhost:3000/transactions')
    })

    it.each([
      ['an update', () => client.updateTransaction('1', { type: 'deposit', amountInCents: 1 })],
      ['a delete', () => client.deleteTransaction('1')],
      ['a create', () => client.createTransaction({ type: 'deposit', amountInCents: 1, date: '2026-03-01' })],
    ])('%s throws too', async (_, call) => {
      respondWith({ error: 'UPSTREAM_ERROR' }, 502)

      await expect(call()).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' })
    })

    it('uses UNKNOWN_ERROR for a body that is not JSON', async () => {
      fetchMock.mockResolvedValueOnce(new Response('<html>', { status: 500 }))

      await expect(client.fetchTransactions()).rejects.toMatchObject({ code: 'UNKNOWN_ERROR' })
    })

    it('uses UNKNOWN_ERROR for a JSON body without a code', async () => {
      respondWith({}, 500)

      await expect(client.fetchTransactions()).rejects.toMatchObject({ code: 'UNKNOWN_ERROR' })
    })

    it('lets a network failure through', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      await expect(client.fetchTransactions()).rejects.toBeInstanceOf(TypeError)
    })
  })
})

describe('@bytebank/bff/client', () => {
  it('is exposed through the subpath', () => {
    expect(fromSubpath).toBe(createTransactionsClient)
  })

  it('stays out of the main entry, which is server code', () => {
    expect(bff).not.toHaveProperty('createTransactionsClient')
  })

  it('imports types only, so no server code can reach the browser', () => {
    const source = readFileSync(new URL('./createTransactionsClient.ts', import.meta.url), 'utf8')

    expect(source).not.toMatch(/^import (?!type )/m)
    expect(source).not.toMatch(/\bimport\(|\brequire\(/)
  })
})
