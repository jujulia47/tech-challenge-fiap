import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createTransactionsApi } from './createTransactionsApi'
import { createTransactionsStore } from './createTransactionsStore'

const transactionsApi = createTransactionsApi('/dashboard')
const { endpoints } = transactionsApi
const balance = { amountInCents: 115000 }
const chartData = { byMonth: [], byType: [] }
const statement = { groups: [] }
const transaction = { id: '1', userId: '1', type: 'deposit', amountInCents: 100, date: '2026-03-01' } as const

const fetchMock = vi.fn<typeof fetch>()
const location = { href: 'http://localhost:3000/dashboard' }

const createStore = () => createTransactionsStore(transactionsApi)
type TestStore = ReturnType<typeof createStore>

// Routes by URL, because a refetch can happen in any order
function respond(routes: Record<string, unknown>) {
  fetchMock.mockImplementation(async url => {
    const path = String(url).split('?')[0]
    return new Response(JSON.stringify(routes[path] ?? []), { status: 200 })
  })
}

const callsTo = (path: string) => fetchMock.mock.calls.filter(([url]) => String(url).startsWith(path))
const settle = () => new Promise(resolve => setTimeout(resolve, 0))

const ROUTES = {
  '/dashboard/api/transactions': [transaction],
  '/dashboard/api/transactions/1': transaction,
  '/dashboard/api/balance': balance,
  '/dashboard/api/statement': statement,
  '/dashboard/api/chart-data': chartData,
}

beforeEach(() => {
  fetchMock.mockReset()
  location.href = 'http://localhost:3000/dashboard'
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('window', { location })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('createTransactionsApi', () => {
  describe('queries', () => {
    beforeEach(() => respond(ROUTES))

    it('uses the basePath of the zone', async () => {
      const api = createTransactionsApi('/transactions')

      await createTransactionsStore(api).dispatch(api.endpoints.getTransactions.initiate())

      expect(fetchMock.mock.calls[0][0]).toBe('/transactions/api/transactions')
    })

    it('reads the transactions of the dashboard zone', async () => {
      const { data } = await createStore().dispatch(endpoints.getTransactions.initiate())

      expect(data).toEqual([transaction])
      expect(fetchMock.mock.calls[0][0]).toBe('/dashboard/api/transactions')
    })

    it('reads the balance', async () => {
      const { data } = await createStore().dispatch(endpoints.getBalance.initiate())

      expect(data).toEqual(balance)
      expect(fetchMock.mock.calls[0][0]).toBe('/dashboard/api/balance')
    })

    it('reads the statement', async () => {
      const { data } = await createStore().dispatch(endpoints.getStatement.initiate())

      expect(data).toEqual(statement)
      expect(fetchMock.mock.calls[0][0]).toBe('/dashboard/api/statement')
    })

    it.each([
      [{ period: 'all' }, '/dashboard/api/chart-data?period=all'],
      [{ period: 3, type: 'payment' }, '/dashboard/api/chart-data?period=3&type=payment'],
    ] as const)('reads the chart data for %j', async (filters, url) => {
      await createStore().dispatch(endpoints.getChartData.initiate(filters))

      expect(fetchMock.mock.calls[0][0]).toBe(url)
    })
  })

  describe('mutations', () => {
    beforeEach(() => respond(ROUTES))

    it('creates with a POST', async () => {
      const data = { type: 'deposit', amountInCents: 100, date: '2026-03-01' } as const

      await createStore().dispatch(endpoints.createTransaction.initiate(data))

      expect(fetchMock.mock.calls[0][0]).toBe('/dashboard/api/transactions')
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST', body: JSON.stringify(data) })
    })

    it('edits with a PATCH of only the changes', async () => {
      const changes = { type: 'payment', amountInCents: 200 } as const

      await createStore().dispatch(endpoints.updateTransaction.initiate({ id: '1', changes }))

      expect(fetchMock.mock.calls[0][0]).toBe('/dashboard/api/transactions/1')
      expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'PATCH', body: JSON.stringify(changes) })
    })

    it('deletes with a DELETE, which has no body to read', async () => {
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

      const result = await createStore().dispatch(endpoints.deleteTransaction.initiate('1'))

      expect(result).toEqual({ data: null })
      expect(fetchMock.mock.calls[0][1]).toEqual({ method: 'DELETE' })
    })
  })

  describe('invalidation', () => {
    async function subscribeToEverything() {
      const store = createStore()
      await Promise.all([
        store.dispatch(endpoints.getTransactions.initiate()),
        store.dispatch(endpoints.getBalance.initiate()),
        store.dispatch(endpoints.getStatement.initiate()),
        store.dispatch(endpoints.getChartData.initiate({ period: 'all' })),
      ])
      fetchMock.mockClear()
      return store
    }

    const data = { type: 'deposit', amountInCents: 100, date: '2026-03-01' } as const
    const changes = { type: 'payment', amountInCents: 200 } as const

    it.each([
      ['create', (store: TestStore) => store.dispatch(endpoints.createTransaction.initiate(data))],
      ['edit', (store: TestStore) => store.dispatch(endpoints.updateTransaction.initiate({ id: '1', changes }))],
      ['delete', (store: TestStore) => store.dispatch(endpoints.deleteTransaction.initiate('1'))],
    ])('%s reads the list, the balance, the statement and the charts again', async (_, mutate) => {
      respond(ROUTES)
      const store = await subscribeToEverything()

      await mutate(store)
      await settle()

      expect(callsTo('/dashboard/api/balance')).toHaveLength(1)
      expect(callsTo('/dashboard/api/chart-data')).toHaveLength(1)
      expect(callsTo('/dashboard/api/statement')).toHaveLength(1)
      expect(callsTo('/dashboard/api/transactions').filter(([, init]) => !init)).toHaveLength(1)
    })

    it('reads again after a failed write too: a timeout may have applied it', async () => {
      respond(ROUTES)
      const store = await subscribeToEverything()
      fetchMock.mockResolvedValueOnce(new Response('{"error":"UPSTREAM_ERROR"}', { status: 502 }))

      await store.dispatch(endpoints.deleteTransaction.initiate('1'))
      await settle()

      expect(callsTo('/dashboard/api/balance')).toHaveLength(1)
    })
  })

  describe('failures', () => {
    it('keeps the code of the BFF, in a form the store can hold', async () => {
      fetchMock.mockResolvedValueOnce(new Response('{"error":"UPSTREAM_ERROR"}', { status: 502 }))

      const { error } = await createStore().dispatch(endpoints.getBalance.initiate())

      expect(error).toEqual({ code: 'UPSTREAM_ERROR' })
    })

    it('reports a network failure', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

      const { error } = await createStore().dispatch(endpoints.getBalance.initiate())

      expect(error).toEqual({ code: 'NETWORK_ERROR' })
    })

    it('still sends a 401 to the root of the shell', async () => {
      fetchMock.mockResolvedValueOnce(new Response('{"error":"UNAUTHENTICATED"}', { status: 401 }))

      await createStore().dispatch(endpoints.getBalance.initiate())

      expect(location.href).toBe('/')
    })

    it('makes unwrap reject on a failed mutation, so the screen can show its toast', async () => {
      fetchMock.mockResolvedValue(new Response('{"error":"UPSTREAM_ERROR"}', { status: 502 }))

      const result = createStore().dispatch(endpoints.deleteTransaction.initiate('1')).unwrap()

      await expect(result).rejects.toEqual({ code: 'UPSTREAM_ERROR' })
    })
  })
})
