import { ApplicationError, DomainError, type TransactionRepository } from '@bytebank/core'
import { aTransaction } from '@bytebank/core/testing'
import { InfrastructureError } from '@bytebank/infrastructure'
import { describe, expect, it, vi } from 'vitest'
import {
  ALLOWED_ORIGIN,
  deleteRequest,
  getRequest,
  jsonRequest,
  rawRequest,
  setup,
  validBody,
} from '../testing/handlerHarness'
import { createTransactionHandlers, MAX_BODY_BYTES } from './createTransactionHandlers'

const UPSTREAM_URL = 'http://internal-backend:3001/transactions?_where=user-a'

function failingWith(error: unknown): TransactionRepository {
  const fail = async (): Promise<never> => {
    throw error
  }
  return { findAllByUser: fail, findById: fail, create: fail, update: fail, delete: fail }
}

const TRANSLATIONS: Array<[string, unknown, number, object]> = [
  [
    'DomainError',
    new DomainError('MONEY_INVALID_CENTS', 'internal detail'),
    422,
    { error: 'MONEY_INVALID_CENTS' },
  ],
  [
    'TRANSACTION_NOT_FOUND',
    new ApplicationError('TRANSACTION_NOT_FOUND', 'internal detail'),
    404,
    { error: 'TRANSACTION_NOT_FOUND' },
  ],
  [
    'TRANSACTION_DATE_IN_FUTURE',
    new ApplicationError('TRANSACTION_DATE_IN_FUTURE', 'internal detail'),
    422,
    { error: 'TRANSACTION_DATE_IN_FUTURE' },
  ],
  [
    'InfrastructureError',
    new InfrastructureError(`internal detail: ${UPSTREAM_URL}`, { status: 503, url: UPSTREAM_URL }),
    502,
    { error: 'UPSTREAM_ERROR' },
  ],
  [
    'UPSTREAM_UNREACHABLE',
    new InfrastructureError(`internal detail: ${UPSTREAM_URL}`, { code: 'UPSTREAM_UNREACHABLE', url: UPSTREAM_URL }),
    502,
    { error: 'UPSTREAM_ERROR' },
  ],
  [
    'UPSTREAM_TIMEOUT',
    new InfrastructureError(`internal detail: ${UPSTREAM_URL}`, { code: 'UPSTREAM_TIMEOUT', url: UPSTREAM_URL }),
    502,
    { error: 'UPSTREAM_ERROR' },
  ],
  [
    'CORRUPTED_RECORD',
    new InfrastructureError('Stored transaction is invalid: record-id', { code: 'CORRUPTED_RECORD' }),
    502,
    { error: 'UPSTREAM_ERROR' },
  ],
  [
    'UPSTREAM_INVALID_RESPONSE',
    new InfrastructureError('internal detail', { code: 'UPSTREAM_INVALID_RESPONSE' }),
    502,
    { error: 'UPSTREAM_ERROR' },
  ],
  ['an unknown Error', new Error('internal detail'), 500, { error: 'INTERNAL_ERROR' }],
  ['a bug that throws a TypeError', new TypeError('internal detail'), 500, { error: 'INTERNAL_ERROR' }],
  ['a thrown string', 'internal detail', 500, { error: 'INTERNAL_ERROR' }],
  ['undefined', undefined, 500, { error: 'INTERNAL_ERROR' }],
]

describe('error translation', () => {
  it.each(TRANSLATIONS)('translates %s', async (_, error, status, body) => {
    const { handlers } = setup({ repository: failingWith(error) })

    const response = await handlers.listTransactions(getRequest())

    expect(response.status).toBe(status)
    expect(await response.json()).toEqual(body)
  })

  it.each(TRANSLATIONS)('hands %s to the logger, untouched', async (_, error) => {
    const logger = { error: vi.fn() }
    const { handlers } = setup({ repository: failingWith(error), logger })

    await handlers.listTransactions(getRequest())

    expect(logger.error).toHaveBeenCalledExactlyOnceWith(error)
  })

  it('does not need a logger', async () => {
    const { handlers } = setup({ repository: failingWith(new Error('boom')) })

    await expect(handlers.listTransactions(getRequest())).resolves.toBeInstanceOf(Response)
  })

  it('logs nothing on success', async () => {
    const logger = { error: vi.fn() }
    const { handlers } = setup({ logger })

    await handlers.listTransactions(getRequest())

    expect(logger.error).not.toHaveBeenCalled()
  })

  it('logs nothing when there is no session: no error happened', async () => {
    const logger = { error: vi.fn() }
    const { handlers } = setup({ userId: null, logger })

    await handlers.listTransactions(getRequest())

    expect(logger.error).not.toHaveBeenCalled()
  })

  it('hands validation errors to the logger', async () => {
    const logger = { error: vi.fn() }
    const { handlers } = setup({ logger })

    await handlers.createTransaction(jsonRequest('POST', {}))

    expect(logger.error).toHaveBeenCalledOnce()
  })

  describe('the 502', () => {
    const upstreamFailure = new InfrastructureError(`Request failed with status 503: ${UPSTREAM_URL}`, {
      status: 503,
      url: UPSTREAM_URL,
    })

    it.each([
      ['the URL', 'internal-backend'],
      ['the query', '_where'],
      ['the status', '503'],
      ['the message', 'Request failed'],
    ])('does not leak %s', async (_, detail) => {
      const { handlers } = setup({ repository: failingWith(upstreamFailure) })

      const response = await handlers.listTransactions(getRequest())

      expect(response.status).toBe(502)
      expect(await response.text()).not.toContain(detail)
    })

    it('does not leak the id of a corrupted record', async () => {
      const corrupted = new InfrastructureError('Stored transaction is invalid: record-id', {
        code: 'CORRUPTED_RECORD',
      })
      const { handlers } = setup({ repository: failingWith(corrupted) })

      const response = await handlers.listTransactions(getRequest())

      expect(await response.text()).toBe('{"error":"UPSTREAM_ERROR"}')
    })

    it('has the same body in every handler', async () => {
      const { handlers } = setup({ repository: failingWith(upstreamFailure) })

      const responses = await Promise.all([
        handlers.listTransactions(getRequest()),
        handlers.createTransaction(jsonRequest('POST', validBody)),
        handlers.updateTransaction(jsonRequest('PATCH', { amountInCents: 1 }), 'a'),
        handlers.deleteTransaction(deleteRequest(), 'a'),
        handlers.getBalance(getRequest()),
        handlers.getStatement(getRequest()),
        handlers.getChartData(getRequest('?period=all')),
      ])

      for (const response of responses) {
        expect(response.status).toBe(502)
        expect(await response.json()).toEqual({ error: 'UPSTREAM_ERROR' })
      }
    })
  })

  it('translates a failure in getUserId, without details', async () => {
    const { useCases } = setup()
    const logger = { error: vi.fn() }
    const failure = new Error('session store is down')
    const handlers = createTransactionHandlers({
      getUserId: async () => {
        throw failure
      },
      useCases,
      allowedOrigins: [ALLOWED_ORIGIN],
      logger,
    })

    const response = await handlers.listTransactions(getRequest())

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'INTERNAL_ERROR' })
    expect(logger.error).toHaveBeenCalledExactlyOnceWith(failure)
  })
})

describe('response headers', () => {
  const failing = (error: unknown) => setup({ repository: failingWith(error) }).handlers

  const RESPONSES: Array<[number, () => Promise<Response>]> = [
    [200, () => setup().handlers.listTransactions(getRequest())],
    [201, () => setup().handlers.createTransaction(jsonRequest('POST', validBody))],
    [400, () => setup().handlers.createTransaction(jsonRequest('POST', {}))],
    [400, () => setup().handlers.createTransaction(rawRequest('POST', '{'))],
    [401, () => setup({ userId: null }).handlers.getBalance(getRequest())],
    [403, () => setup().handlers.deleteTransaction(deleteRequest({}), 'missing')],
    [404, () => setup().handlers.deleteTransaction(deleteRequest(), 'missing')],
    [
      413,
      () =>
        setup().handlers.createTransaction(
          rawRequest('POST', '{}', { 'Content-Length': String(MAX_BODY_BYTES + 1) }),
        ),
    ],
    [422, () => setup().handlers.createTransaction(jsonRequest('POST', { ...validBody, date: '2026-02-31' }))],
    [502, () => failing(new InfrastructureError('down')).getStatement(getRequest())],
    [500, () => failing(new Error('boom')).getChartData(getRequest('?period=all'))],
  ]

  it.each(RESPONSES)('%i has no-store and a JSON Content-Type', async (status, respond) => {
    const response = await respond()

    expect(response.status).toBe(status)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Type')).toBe('application/json')
  })

  it('204 has no-store and no Content-Type', async () => {
    const { handlers } = setup({ transactions: [aTransaction({ id: 'a' })] })

    const response = await handlers.deleteTransaction(deleteRequest(), 'a')

    expect(response.status).toBe(204)
    expect(response.headers.get('Cache-Control')).toBe('no-store')
    expect(response.headers.get('Content-Type')).toBeNull()
  })
})
