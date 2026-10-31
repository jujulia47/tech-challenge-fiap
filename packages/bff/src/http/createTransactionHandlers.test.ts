import { aTransaction } from '@bytebank/core/testing'
import { describe, expect, it } from 'vitest'
import type { UseCases } from '../composition/createUseCases'
import {
  ALLOWED_ORIGIN,
  deleteRequest,
  getRequest,
  jsonRequest,
  setup,
  validBody,
} from '../testing/handlerHarness'
import { createTransactionHandlers, type TransactionHandlers } from './createTransactionHandlers'

const ATTACHMENT = 'data:image/png;base64,AAAA'

const older = aTransaction({ id: 'older', date: '2026-01-10', amountInCents: 1000 })
const newer = aTransaction({ id: 'newer', date: '2026-03-01', type: 'payment', amountInCents: 400 })
const withAttachment = aTransaction({ id: 'attached', attachment: ATTACHMENT })
const ofUserB = aTransaction({ id: 'of-b', userId: 'user-b', date: '2026-02-01', amountInCents: 7000 })

type HandlerCall = (handlers: TransactionHandlers, request: Request) => Promise<Response>

const HANDLER_CALLS: Array<[keyof TransactionHandlers, HandlerCall]> = [
  ['listTransactions', (handlers, request) => handlers.listTransactions(request)],
  ['createTransaction', (handlers, request) => handlers.createTransaction(request)],
  ['updateTransaction', (handlers, request) => handlers.updateTransaction(request, 'older')],
  ['deleteTransaction', (handlers, request) => handlers.deleteTransaction(request, 'older')],
  ['getBalance', (handlers, request) => handlers.getBalance(request)],
  ['getStatement', (handlers, request) => handlers.getStatement(request)],
  ['getChartData', (handlers, request) => handlers.getChartData(request)],
]

// Any access fails the test: the error would turn the expected 401 into a 500
const unreachableUseCases = new Proxy({} as UseCases, {
  get() {
    throw new Error('A use case ran')
  },
})

describe('createTransactionHandlers', () => {
  describe('listTransactions', () => {
    it('returns the DTOs of the user, newest first', async () => {
      const { handlers } = setup({ transactions: [older, newer] })

      const response = await handlers.listTransactions(getRequest())

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual([newer.toPrimitives(), older.toPrimitives()])
    })

    it('ignores a userId in the query string', async () => {
      const { handlers } = setup({ transactions: [ofUserB] })

      const response = await handlers.listTransactions(getRequest('?userId=user-b'))

      expect(await response.json()).toEqual([])
    })
  })

  describe('createTransaction', () => {
    it('answers 201 with the DTO of the new transaction', async () => {
      const { handlers } = setup()

      const response = await handlers.createTransaction(jsonRequest('POST', validBody))

      expect(response.status).toBe(201)
      expect(await response.json()).toEqual({ ...validBody, id: 'id-1', userId: 'user-a' })
    })

    it('stores the transaction for the user of the session', async () => {
      const { handlers } = setup()

      await handlers.createTransaction(jsonRequest('POST', validBody))

      const response = await handlers.listTransactions(getRequest())
      expect(await response.json()).toEqual([{ ...validBody, id: 'id-1', userId: 'user-a' }])
    })

    it('keeps the attachment', async () => {
      const { handlers } = setup()

      const response = await handlers.createTransaction(
        jsonRequest('POST', { ...validBody, attachment: ATTACHMENT }),
      )

      expect(await response.json()).toMatchObject({ attachment: ATTACHMENT })
    })
  })

  describe('updateTransaction', () => {
    it('changes only the fields in the body', async () => {
      const { handlers } = setup({ transactions: [older] })

      const response = await handlers.updateTransaction(
        jsonRequest('PATCH', { amountInCents: 2500 }),
        'older',
      )

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ ...older.toPrimitives(), amountInCents: 2500 })
    })

    it.each([
      ['type', { type: 'withdrawal' }],
      ['date', { date: '2026-02-02' }],
      ['attachment', { attachment: ATTACHMENT }],
    ])('accepts a body with only %s', async (_, changes) => {
      const { handlers } = setup({ transactions: [older] })

      const response = await handlers.updateTransaction(jsonRequest('PATCH', changes), 'older')

      expect(await response.json()).toEqual({ ...older.toPrimitives(), ...changes })
    })

    it('keeps the attachment when the body does not mention it', async () => {
      const { handlers } = setup({ transactions: [withAttachment] })

      const response = await handlers.updateTransaction(
        jsonRequest('PATCH', { amountInCents: 1 }),
        'attached',
      )

      expect(await response.json()).toMatchObject({ attachment: ATTACHMENT })
    })

    it('removes the attachment with null', async () => {
      const { handlers } = setup({ transactions: [withAttachment] })

      const response = await handlers.updateTransaction(jsonRequest('PATCH', { attachment: null }), 'attached')

      expect(response.status).toBe(200)
      expect(await response.json()).not.toHaveProperty('attachment')
      const [stored] = await (await handlers.listTransactions(getRequest())).json()
      expect(stored).not.toHaveProperty('attachment')
    })
  })

  describe('deleteTransaction', () => {
    it('answers 204 without a body and removes the transaction', async () => {
      const { handlers } = setup({ transactions: [older] })

      const response = await handlers.deleteTransaction(deleteRequest(), 'older')

      expect(response.status).toBe(204)
      expect(response.body).toBeNull()
      expect(await (await handlers.listTransactions(getRequest())).json()).toEqual([])
    })
  })

  describe('getBalance', () => {
    it('returns the balance of the user in cents', async () => {
      const { handlers } = setup({ transactions: [older, newer] })

      const response = await handlers.getBalance(getRequest())

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({ amountInCents: 600 })
    })
  })

  describe('getStatement', () => {
    it('returns the transactions grouped by month', async () => {
      const { handlers } = setup({ transactions: [older, newer] })

      const response = await handlers.getStatement(getRequest())

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        groups: [
          { monthKey: '2026-03', transactions: [newer.toPrimitives()] },
          { monthKey: '2026-01', transactions: [older.toPrimitives()] },
        ],
      })
    })
  })

  describe('getChartData', () => {
    const outOfRange = aTransaction({ id: 'old', date: '2025-01-10', amountInCents: 9000 })

    it.each([
      ['3', [{ monthKey: '2026-01', amountInCents: 1000 }, { monthKey: '2026-03', amountInCents: 400 }]],
      ['6', [{ monthKey: '2026-01', amountInCents: 1000 }, { monthKey: '2026-03', amountInCents: 400 }]],
      [
        'all',
        [
          { monthKey: '2025-01', amountInCents: 9000 },
          { monthKey: '2026-01', amountInCents: 1000 },
          { monthKey: '2026-03', amountInCents: 400 },
        ],
      ],
    ])('filters by the period %s', async (period, byMonth) => {
      const { handlers } = setup({ transactions: [outOfRange, older, newer] })

      const response = await handlers.getChartData(getRequest(`?period=${period}`))

      expect(response.status).toBe(200)
      expect(await response.json()).toMatchObject({ byMonth })
    })

    it('narrows byMonth to the type and keeps byType complete', async () => {
      const { handlers } = setup({ transactions: [older, newer] })

      const response = await handlers.getChartData(getRequest('?period=all&type=payment'))

      expect(response.status).toBe(200)
      expect(await response.json()).toEqual({
        byMonth: [{ monthKey: '2026-03', amountInCents: 400 }],
        byType: [
          { type: 'deposit', amountInCents: 1000 },
          { type: 'payment', amountInCents: 400 },
        ],
      })
    })

    it('answers the same without the type as before the filter existed', async () => {
      const { handlers } = setup({ transactions: [older, newer] })

      const response = await handlers.getChartData(getRequest('?period=all'))

      expect(await response.json()).toEqual({
        byMonth: [
          { monthKey: '2026-01', amountInCents: 1000 },
          { monthKey: '2026-03', amountInCents: 400 },
        ],
        byType: [
          { type: 'deposit', amountInCents: 1000 },
          { type: 'payment', amountInCents: 400 },
        ],
      })
    })

    it('tells 3 from 6 months', async () => {
      const inSixMonths = aTransaction({ id: 'six', date: '2025-11-10', amountInCents: 5 })
      const { handlers } = setup({ transactions: [inSixMonths, newer] })

      const three = await handlers.getChartData(getRequest('?period=3'))
      const six = await handlers.getChartData(getRequest('?period=6'))

      expect((await three.json()).byMonth).toHaveLength(1)
      expect((await six.json()).byMonth).toHaveLength(2)
    })
  })

  describe('without a session', () => {
    it.each(HANDLER_CALLS)('%s answers 401, reads nothing and runs no use case', async (_, call) => {
      const handlers = createTransactionHandlers({
        getUserId: async () => null,
        useCases: unreachableUseCases,
        allowedOrigins: [ALLOWED_ORIGIN],
      })
      const request = jsonRequest('POST', validBody)

      const response = await call(handlers, request)

      expect(response.status).toBe(401)
      expect(await response.json()).toEqual({ error: 'UNAUTHENTICATED' })
      expect(request.bodyUsed).toBe(false)
    })

    it('answers 401 before validating', async () => {
      const { handlers } = setup({ userId: null })

      const response = await handlers.createTransaction(jsonRequest('POST', { userId: 'user-b' }))

      expect(response.status).toBe(401)
    })

    it('treats an empty user id as no session', async () => {
      const { handlers } = setup({ userId: '' })

      const response = await handlers.listTransactions(getRequest())

      expect(response.status).toBe(401)
    })

    it('hands the request to getUserId', async () => {
      const { useCases } = setup({ transactions: [ofUserB] })
      const handlers = createTransactionHandlers({
        getUserId: async request => request.headers.get('X-User'),
        useCases,
        allowedOrigins: [ALLOWED_ORIGIN],
      })

      const request = new Request('http://bff.test', { headers: { 'X-User': 'user-b' } })

      const response = await handlers.listTransactions(request)

      expect(await response.json()).toEqual([ofUserB.toPrimitives()])
    })
  })

  describe('isolation between users', () => {
    const asUserA = () => setup({ transactions: [ofUserB], userId: 'user-a' })
    const transactionsOfUserB = (useCases: UseCases) => useCases.listTransactions.execute('user-b')

    it('does not list transactions of another user', async () => {
      const { handlers } = asUserA()

      expect(await (await handlers.listTransactions(getRequest())).json()).toEqual([])
    })

    it.each([
      ['getBalance', { amountInCents: 0 }],
      ['getStatement', { groups: [] }],
    ] as const)('does not count them in %s', async (handler, expected) => {
      const { handlers } = asUserA()

      expect(await (await handlers[handler](getRequest())).json()).toEqual(expected)
    })

    it('does not count them in getChartData', async () => {
      const { handlers } = asUserA()

      const response = await handlers.getChartData(getRequest('?period=all'))

      expect(await response.json()).toEqual({ byMonth: [], byType: [] })
    })

    it('answers 404, not 403, on update, and changes nothing', async () => {
      const { handlers, useCases } = asUserA()

      const response = await handlers.updateTransaction(jsonRequest('PATCH', { amountInCents: 1 }), 'of-b')

      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: 'TRANSACTION_NOT_FOUND' })
      expect(await transactionsOfUserB(useCases)).toEqual([ofUserB.toPrimitives()])
    })

    it('answers 404, not 403, on delete, and keeps the transaction', async () => {
      const { handlers, useCases } = asUserA()

      const response = await handlers.deleteTransaction(deleteRequest(), 'of-b')

      expect(response.status).toBe(404)
      expect(await response.json()).toEqual({ error: 'TRANSACTION_NOT_FOUND' })
      expect(await transactionsOfUserB(useCases)).toEqual([ofUserB.toPrimitives()])
    })

    it('answers exactly the same for an id that does not exist', async () => {
      const { handlers } = asUserA()

      const missing = await handlers.deleteTransaction(deleteRequest(), 'missing')
      const foreign = await handlers.deleteTransaction(deleteRequest(), 'of-b')

      expect(await missing.json()).toEqual(await foreign.json())
      expect(missing.status).toBe(foreign.status)
    })
  })
})
