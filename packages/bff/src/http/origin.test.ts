import { aTransaction } from '@bytebank/core/testing'
import { describe, expect, it, vi } from 'vitest'
import type { UseCases } from '../composition/createUseCases'
import { ALLOWED_ORIGIN, deleteRequest, getRequest, jsonRequest, setup, validBody } from '../testing/handlerHarness'
import { createTransactionHandlers, type TransactionHandlers } from './createTransactionHandlers'
import { isAllowedOrigin } from './origin'

const ENDPOINT = 'http://bff.test/transactions'
const STRANGER = 'https://evil.example'

const existing = aTransaction({ id: 'existing', date: '2026-01-10' })

// Any access fails the test: the error would turn the expected status into a 500
const unreachableUseCases = new Proxy({} as UseCases, {
  get() {
    throw new Error('A use case ran')
  },
})

type WriteCall = (handlers: TransactionHandlers, headers: Record<string, string>) => [Promise<Response>, Request]

function postWith(handlers: TransactionHandlers, headers: Record<string, string>): [Promise<Response>, Request] {
  const request = new Request(ENDPOINT, { method: 'POST', body: JSON.stringify(validBody), headers })
  return [handlers.createTransaction(request), request]
}

const WRITES: Array<[string, WriteCall]> = [
  ['POST', postWith],
  [
    'PATCH',
    (handlers, headers) => {
      const request = new Request(ENDPOINT, { method: 'PATCH', body: '{"amountInCents":1}', headers })
      return [handlers.updateTransaction(request, 'existing'), request]
    },
  ],
  [
    'DELETE',
    (handlers, headers) => {
      const request = deleteRequest(headers)
      return [handlers.deleteTransaction(request, 'existing'), request]
    },
  ],
]

function isAllowed(headers: Record<string, string>, allowedOrigins: readonly string[] = [ALLOWED_ORIGIN]): boolean {
  return isAllowedOrigin(new Request(ENDPOINT, { headers }), allowedOrigins)
}

describe('origin check', () => {
  describe.each(WRITES)('%s', (_, write) => {
    it('passes with an allowed Origin', async () => {
      const { handlers } = setup({ transactions: [existing] })

      const [response] = write(handlers, { Origin: ALLOWED_ORIGIN })

      expect((await response).status).toBeLessThan(300)
    })

    it('answers 403 for a strange Origin, with no session read, body read or use case', async () => {
      const getUserId = vi.fn(async () => 'user-a')
      const handlers = createTransactionHandlers({
        getUserId,
        useCases: unreachableUseCases,
        allowedOrigins: [ALLOWED_ORIGIN],
      })

      const [pending, request] = write(handlers, { Origin: STRANGER })
      const response = await pending

      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({ error: 'FORBIDDEN_ORIGIN' })
      expect(getUserId).not.toHaveBeenCalled()
      expect(request.bodyUsed).toBe(false)
    })

    it('passes without Origin, with a valid Referer', async () => {
      const { handlers } = setup({ transactions: [existing] })

      const [response] = write(handlers, { Referer: `${ALLOWED_ORIGIN}/dashboard/statement?page=2` })

      expect((await response).status).toBeLessThan(300)
    })

    it('answers 403 without Origin, with a strange Referer', async () => {
      const { handlers } = setup({ transactions: [existing] })

      const [response] = write(handlers, { Referer: `${STRANGER}/page` })

      expect((await response).status).toBe(403)
    })

    it('answers 403 with neither header', async () => {
      const { handlers } = setup({ transactions: [existing] })

      const [pending] = write(handlers, {})
      const response = await pending

      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({ error: 'FORBIDDEN_ORIGIN' })
    })

    it('answers 403 before 401: a forged request learns nothing about the session', async () => {
      const { handlers } = setup({ userId: null })

      const [response] = write(handlers, { Origin: STRANGER })

      expect((await response).status).toBe(403)
    })

    it('answers 401 for an allowed Origin without a session', async () => {
      const { handlers } = setup({ userId: null })

      const [response] = write(handlers, { Origin: ALLOWED_ORIGIN })

      expect((await response).status).toBe(401)
    })
  })

  it('has the standard headers on the 403', async () => {
    const { handlers } = setup()

    const [pending] = postWith(handlers, { Origin: STRANGER })
    const { headers } = await pending

    expect(headers.get('Cache-Control')).toBe('no-store')
    expect(headers.get('Content-Type')).toBe('application/json')
  })

  it('does not log the 403: nothing failed', async () => {
    const logger = { error: vi.fn() }
    const { handlers } = setup({ logger })

    await postWith(handlers, { Origin: STRANGER })[0]

    expect(logger.error).not.toHaveBeenCalled()
  })

  describe('GET', () => {
    const READS: Array<[string, (handlers: TransactionHandlers, request: Request) => Promise<Response>]> = [
      ['listTransactions', (handlers, request) => handlers.listTransactions(request)],
      ['getBalance', (handlers, request) => handlers.getBalance(request)],
      ['getStatement', (handlers, request) => handlers.getStatement(request)],
      ['getChartData', (handlers, request) => handlers.getChartData(request)],
    ]

    it.each(READS)('%s passes without Origin', async (_, read) => {
      const response = await read(setup().handlers, getRequest('?period=all'))

      expect(response.status).toBe(200)
    })

    it.each(READS)('%s passes with a strange Origin', async (_, read) => {
      const request = new Request(`${ENDPOINT}?period=all`, { headers: { Origin: STRANGER } })

      const response = await read(setup().handlers, request)

      expect(response.status).toBe(200)
    })
  })

  describe('isAllowedOrigin', () => {
    it.each([
      ['a subdomain trick', 'http://bff.test.evil.example'],
      ['a prefix trick', 'http://bff.testing'],
      ['another port', 'http://bff.test:8080'],
      ['another scheme', 'https://bff.test'],
      ['different casing', 'HTTP://BFF.TEST'],
      ['a trailing slash', 'http://bff.test/'],
      ['a path', 'http://bff.test/dashboard'],
      ['the null origin', 'null'],
      ['an empty value', ''],
    ])('refuses %s in Origin', (_, Origin) => {
      expect(isAllowed({ Origin })).toBe(false)
    })

    it.each([
      ['a subdomain trick', 'http://bff.test.evil.example/page'],
      ['the allowed origin in the path', 'https://evil.example/http://bff.test/page'],
      ['the allowed origin in the query', 'https://evil.example/?from=http://bff.test'],
      ['the allowed origin in the credentials', 'http://bff.test@evil.example/'],
      ['another scheme', 'https://bff.test/page'],
      ['a value that is not a URL', 'not a url'],
      ['a relative path', '/dashboard'],
      ['an empty value', ''],
      ['a page with no origin', 'about:blank'],
    ])('refuses %s in Referer', (_, Referer) => {
      expect(isAllowed({ Referer })).toBe(false)
    })

    it('accepts a Referer with path, query and fragment', () => {
      expect(isAllowed({ Referer: `${ALLOWED_ORIGIN}/page?a=1#top` })).toBe(true)
    })

    it('does not fall back to the Referer when Origin is present', () => {
      expect(isAllowed({ Origin: STRANGER, Referer: `${ALLOWED_ORIGIN}/page` })).toBe(false)
    })

    it('does not fall back to the Referer for the null origin', () => {
      expect(isAllowed({ Origin: 'null', Referer: `${ALLOWED_ORIGIN}/page` })).toBe(false)
    })

    it('does not fall back to the Referer for an empty Origin', () => {
      expect(isAllowed({ Origin: '', Referer: `${ALLOWED_ORIGIN}/page` })).toBe(false)
    })

    it('does not need the Referer when Origin is allowed', () => {
      expect(isAllowed({ Origin: ALLOWED_ORIGIN, Referer: `${STRANGER}/page` })).toBe(true)
    })

    it('accepts any origin in the list', () => {
      const origins = ['http://localhost:3000', 'https://bytebank.example']

      expect(isAllowed({ Origin: 'https://bytebank.example' }, origins)).toBe(true)
    })

    it('refuses everything with an empty list', () => {
      expect(isAllowed({ Origin: ALLOWED_ORIGIN }, [])).toBe(false)
      expect(isAllowed({ Referer: `${ALLOWED_ORIGIN}/page` }, [])).toBe(false)
    })
  })

  it('reaches the use case with the body intact after the check', async () => {
    const { handlers } = setup()

    const response = await handlers.createTransaction(jsonRequest('POST', validBody))

    expect(response.status).toBe(201)
  })
})
