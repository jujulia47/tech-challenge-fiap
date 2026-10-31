import { TRANSACTION_TYPES } from '@bytebank/core'
import { aTransaction } from '@bytebank/core/testing'
import { describe, expect, it } from 'vitest'
import {
  ALLOWED_ORIGIN,
  TODAY,
  dataUrl,
  deleteRequest,
  getRequest,
  jsonRequest,
  rawRequest,
  setup,
  streamRequest,
  validBody,
} from '../testing/handlerHarness'
import { MAX_BODY_BYTES } from './createTransactionHandlers'
import { MAX_ATTACHMENT_BYTES } from './limits'

const existing = aTransaction({ id: 'existing', date: '2026-01-10' })
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf']

const post = (body: unknown) => setup().handlers.createTransaction(jsonRequest('POST', body))
const patch = (body: unknown, id = 'existing') =>
  setup({ transactions: [existing] }).handlers.updateTransaction(jsonRequest('PATCH', body), id)
const postRaw = (body: string, headers?: Record<string, string>) =>
  setup().handlers.createTransaction(rawRequest('POST', body, headers))

const fields = (response: Response): Promise<string[]> =>
  response.json().then((body: { issues: Array<{ field: string }> }) => body.issues.map(issue => issue.field))

const INVALID_TYPES: unknown[] = ['Depósito', 'DEPOSIT', '', 1, null]
const INVALID_AMOUNTS: unknown[] = [0, -1, 1.5, '100', null, Number.MAX_SAFE_INTEGER + 1]
const INVALID_DATES: unknown[] = ['01/03/2026', '2026-3-1', '2026-03-01T00:00:00Z', ' 2026-03-01', 20260301, null]
const INVALID_ATTACHMENTS: Array<[string, unknown]> = [
  ['SVG', dataUrl('image/svg+xml', 8)],
  ['HTML', dataUrl('text/html', 8)],
  ['GIF', dataUrl('image/gif', 8)],
  ['JavaScript', dataUrl('text/javascript', 8)],
  ['an uppercase MIME type', dataUrl('IMAGE/PNG', 8)],
  ['a MIME type with parameters', 'data:image/png;charset=utf-8;base64,AAAA'],
  ['a data URL that is not base64', 'data:image/png,AAAA'],
  ['an empty payload', 'data:image/png;base64,'],
  ['characters outside base64', 'data:image/png;base64,AA*A'],
  ['a payload with a broken length', 'data:image/png;base64,AAAAA'],
  ['too much padding', 'data:image/png;base64,A==='],
  ['a line break after the payload', 'data:image/png;base64,AAAA\n'],
  ['a remote URL', 'https://example.com/file.png'],
  ['plain text', 'file.png'],
  ['a number', 1],
]

describe('request validation', () => {
  describe('POST body', () => {
    it.each(['type', 'amountInCents', 'date'] as const)('requires %s', async field => {
      const response = await post({ ...validBody, [field]: undefined })

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual([field])
    })

    it.each(INVALID_TYPES)('rejects the type %j', async type => {
      const response = await post({ ...validBody, type })

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['type'])
    })

    it.each(INVALID_AMOUNTS)('rejects the amount %j', async amountInCents => {
      const response = await post({ ...validBody, amountInCents })

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['amountInCents'])
    })

    it('rejects an amount that JSON turns into Infinity', async () => {
      const response = await postRaw('{"type":"deposit","amountInCents":1e999,"date":"2026-03-01"}')

      expect(response.status).toBe(400)
    })

    it('accepts the largest safe integer', async () => {
      const response = await post({ ...validBody, amountInCents: Number.MAX_SAFE_INTEGER })

      expect(response.status).toBe(201)
    })

    it.each(INVALID_DATES)('rejects the date %j', async date => {
      const response = await post({ ...validBody, date })

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['date'])
    })

    it.each(['userId', 'id', 'month', 'label'])('rejects the extra field %s', async field => {
      const response = await post({ ...validBody, [field]: 'user-b' })

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['body'])
    })

    it('rejects __proto__ as a key', async () => {
      const response = await postRaw(
        '{"type":"deposit","amountInCents":1,"date":"2026-03-01","__proto__":{"userId":"user-b"}}',
      )

      expect(response.status).toBe(400)
    })

    it.each([[[]], ['text'], [1], [null]])('rejects the body %j', async body => {
      const response = await post(body)

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['body'])
    })

    it('rejects null as an attachment: there is nothing to remove yet', async () => {
      const response = await post({ ...validBody, attachment: null })

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['attachment'])
    })
  })

  describe('rules left to the domain', () => {
    it.each(['2026-02-31', '2026-13-01', '2026-00-10'])(
      'answers 422 for the date %s, which does not exist',
      async date => {
        const response = await post({ ...validBody, date })

        expect(response.status).toBe(422)
        expect(await response.json()).toEqual({ error: 'CALENDAR_DATE_INVALID_VALUE' })
      },
    )

    it('answers 422 for a future date on create', async () => {
      const response = await post({ ...validBody, date: '2026-03-16' })

      expect(response.status).toBe(422)
      expect(await response.json()).toEqual({ error: 'TRANSACTION_DATE_IN_FUTURE' })
    })

    it('answers 422 for a future date on update', async () => {
      const response = await patch({ date: '2026-03-16' })

      expect(response.status).toBe(422)
      expect(await response.json()).toEqual({ error: 'TRANSACTION_DATE_IN_FUTURE' })
    })

    it('accepts today', async () => {
      expect((await post({ ...validBody, date: TODAY })).status).toBe(201)
    })
  })

  describe('attachment', () => {
    it.each(ALLOWED_MIME_TYPES)('accepts %s', async mimeType => {
      const attachment = dataUrl(mimeType, 8)

      const response = await post({ ...validBody, attachment })

      expect(response.status).toBe(201)
      expect(await response.json()).toMatchObject({ attachment })
    })

    it.each(INVALID_ATTACHMENTS)('rejects %s on POST', async (_, attachment) => {
      const response = await post({ ...validBody, attachment })

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['attachment'])
    })

    it.each(INVALID_ATTACHMENTS)('rejects %s on PATCH', async (_, attachment) => {
      const response = await patch({ attachment })

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['attachment'])
    })

    // 71680 bytes need the padding "==", 71681 needs "=" and 71682 needs none
    it.each([
      [MAX_ATTACHMENT_BYTES - 1, 201],
      [MAX_ATTACHMENT_BYTES, 201],
      [MAX_ATTACHMENT_BYTES + 1, 400],
      [MAX_ATTACHMENT_BYTES + 2, 400],
    ])('with %i decoded bytes answers %i', async (bytes, status) => {
      const response = await post({ ...validBody, attachment: dataUrl('application/pdf', bytes) })

      expect(response.status).toBe(status)
    })

    it('reports a forbidden type only once, even when it is also too large', async () => {
      const response = await post({ ...validBody, attachment: dataUrl('image/svg+xml', MAX_ATTACHMENT_BYTES + 1) })

      expect(await fields(response)).toEqual(['attachment'])
    })

    it('is 70 KB', () => {
      expect(MAX_ATTACHMENT_BYTES).toBe(70 * 1024)
    })

    it('rejects an oversized attachment on PATCH', async () => {
      const response = await patch({ attachment: dataUrl('image/png', MAX_ATTACHMENT_BYTES + 1) })

      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: 'VALIDATION_ERROR',
        issues: [{ field: 'attachment', message: 'Must be at most 70 KB' }],
      })
    })
  })

  describe('PATCH body', () => {
    it('requires at least one field', async () => {
      const response = await patch({})

      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: 'VALIDATION_ERROR',
        issues: [{ field: 'body', message: 'At least one field is required' }],
      })
    })

    it('counts attachment: null as a field', async () => {
      expect((await patch({ attachment: null })).status).toBe(200)
    })

    it.each([
      ['type', INVALID_TYPES],
      ['amountInCents', INVALID_AMOUNTS],
      ['date', INVALID_DATES],
    ])('rejects every invalid %s', async (field, values) => {
      for (const value of values) {
        const response = await patch({ [field]: value })

        expect(response.status).toBe(400)
        expect(await fields(response)).toEqual([field])
      }
    })

    it.each(['userId', 'id', 'month'])('rejects the extra field %s', async field => {
      const response = await patch({ amountInCents: 1, [field]: 'user-b' })

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['body'])
    })
  })

  describe('transaction id', () => {
    const INVALID_IDS = ['', '.', '..', '../users/1', 'a/b', 'a b', '%2e%2e', 'x'.repeat(65)]

    it.each(INVALID_IDS)('rejects %j on PATCH before reading the body', async id => {
      const request = jsonRequest('PATCH', { amountInCents: 1 })

      const response = await setup().handlers.updateTransaction(request, id)

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['id'])
      expect(request.bodyUsed).toBe(false)
    })

    it.each(INVALID_IDS)('rejects %j on DELETE', async id => {
      const response = await setup().handlers.deleteTransaction(deleteRequest(), id)

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['id'])
    })

    it.each(['11', '8N9On-LoiYA', 'a_b', '3f2b6d8e-6f43-4b1e-9d57-0d1f6f3a2c11'])('accepts %s', async id => {
      const transaction = aTransaction({ id })

      const response = await setup({ transactions: [transaction] }).handlers.deleteTransaction(deleteRequest(), id)

      expect(response.status).toBe(204)
    })
  })

  describe('chart period', () => {
    it.each(['', '?period=', '?period=12', '?period=ALL', '?period=3.0', '?period=constructor'])(
      'rejects %j',
      async query => {
        const response = await setup().handlers.getChartData(getRequest(query))

        expect(response.status).toBe(400)
        expect(await fields(response)).toEqual(['period'])
      },
    )
  })

  describe('chart type', () => {
    it.each(TRANSACTION_TYPES)('accepts %s', async type => {
      const response = await setup().handlers.getChartData(getRequest(`?period=all&type=${type}`))

      expect(response.status).toBe(200)
    })

    it.each(['', 'Dep%C3%B3sito', 'DEPOSIT', 'deposit,payment', 'constructor'])('rejects %j', async type => {
      const response = await setup().handlers.getChartData(getRequest(`?period=all&type=${type}`))

      expect(response.status).toBe(400)
      expect(await fields(response)).toEqual(['type'])
    })

    it('reports both fields when both are invalid', async () => {
      const response = await setup().handlers.getChartData(getRequest('?period=12&type=x'))

      expect(await fields(response)).toEqual(['period', 'type'])
    })
  })

  describe('body size', () => {
    const OVER_THE_LIMIT = String(MAX_BODY_BYTES + 1)

    it('answers 413 from Content-Length, without reading the body', async () => {
      const request = rawRequest('POST', JSON.stringify(validBody), { 'Content-Length': OVER_THE_LIMIT })

      const response = await setup().handlers.createTransaction(request)

      expect(response.status).toBe(413)
      expect(await response.json()).toEqual({ error: 'PAYLOAD_TOO_LARGE' })
      expect(request.bodyUsed).toBe(false)
    })

    it('applies the same limit on PATCH', async () => {
      const request = rawRequest('PATCH', '{}', { 'Content-Length': OVER_THE_LIMIT })

      const response = await setup({ transactions: [existing] }).handlers.updateTransaction(request, 'existing')

      expect(response.status).toBe(413)
    })

    it('accepts a Content-Length exactly at the limit', async () => {
      const response = await postRaw(JSON.stringify(validBody), { 'Content-Length': String(MAX_BODY_BYTES) })

      expect(response.status).toBe(201)
    })

    it('answers 413 for a large body without Content-Length', async () => {
      const response = await postRaw('x'.repeat(MAX_BODY_BYTES + 1))

      expect(response.status).toBe(413)
    })

    it('counts the bytes, not the characters', async () => {
      const response = await postRaw('é'.repeat(MAX_BODY_BYTES / 2 + 1))

      expect(response.status).toBe(413)
    })

    it('stops at the limit when the body arrives in parts', async () => {
      const half = new Uint8Array(MAX_BODY_BYTES / 2 + 1)
      const request = streamRequest('POST', [half, half, half])

      const response = await setup().handlers.createTransaction(request)

      expect(response.status).toBe(413)
    })

    it('accepts a valid body that arrives in parts', async () => {
      const body = new TextEncoder().encode(JSON.stringify(validBody))
      const request = streamRequest('POST', [body.slice(0, 10), body.slice(10)])

      const response = await setup().handlers.createTransaction(request)

      expect(response.status).toBe(201)
    })

    it('takes the largest attachment within the body limit', async () => {
      const attachment = dataUrl('application/pdf', MAX_ATTACHMENT_BYTES)
      const body = JSON.stringify({ ...validBody, attachment })

      expect(new TextEncoder().encode(body).byteLength).toBeLessThan(MAX_BODY_BYTES)
    })

    it('ignores a Content-Length that is not a number', async () => {
      const response = await postRaw(JSON.stringify(validBody), { 'Content-Length': 'abc' })

      expect(response.status).toBe(201)
    })
  })

  describe('invalid JSON', () => {
    it.each(['{', 'not json', "{'a':1}", ''])('answers 400 for %j', async body => {
      const response = await postRaw(body)

      expect(response.status).toBe(400)
      expect(await response.json()).toEqual({
        error: 'VALIDATION_ERROR',
        issues: [{ field: 'body', message: 'Request body is not valid JSON' }],
      })
    })

    it('answers 400 on PATCH', async () => {
      const request = rawRequest('PATCH', '{')

      const response = await setup({ transactions: [existing] }).handlers.updateTransaction(request, 'existing')

      expect(response.status).toBe(400)
    })

    it('answers 400 for a request with no body', async () => {
      const request = new Request('http://bff.test/transactions', {
        method: 'POST',
        headers: { Origin: ALLOWED_ORIGIN },
      })

      const response = await setup().handlers.createTransaction(request)

      expect(response.status).toBe(400)
    })
  })

  describe('error messages', () => {
    const SECRET = 'received-value-marker'

    it.each([
      ['type', { ...validBody, type: SECRET }],
      ['date', { ...validBody, date: SECRET }],
      ['amountInCents', { ...validBody, amountInCents: SECRET }],
      ['attachment format', { ...validBody, attachment: `data:text/html;base64,${SECRET}` }],
      ['attachment type', { ...validBody, attachment: SECRET }],
      ['an unknown value', { ...validBody, userId: SECRET }],
      ['an unknown key', { ...validBody, [SECRET]: 1 }],
    ])('do not echo the received value: %s', async (_, body) => {
      const response = await post(body)

      expect(response.status).toBe(400)
      expect(await response.text()).not.toContain(SECRET)
    })

    it('do not echo an invalid id', async () => {
      const response = await setup().handlers.deleteTransaction(deleteRequest(), `${SECRET}/x`)

      expect(await response.text()).not.toContain(SECRET)
    })

    it('do not echo an invalid period', async () => {
      const response = await setup().handlers.getChartData(getRequest(`?period=${SECRET}`))

      expect(await response.text()).not.toContain(SECRET)
    })

    it('do not echo invalid JSON', async () => {
      const response = await postRaw(`{${SECRET}`)

      expect(await response.text()).not.toContain(SECRET)
    })

    it('have only field and message in each issue', async () => {
      const response = await post({ ...validBody, type: 'x', userId: 'user-b' })
      const { issues } = (await response.json()) as { issues: object[] }

      for (const issue of issues) expect(Object.keys(issue).sort()).toEqual(['field', 'message'])
    })
  })
})
