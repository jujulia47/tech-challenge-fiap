import { describe, expect, it } from 'vitest'
import { jsonResponse, noContentResponse } from './responses'

describe('jsonResponse', () => {
  it('answers 200 by default', () => {
    expect(jsonResponse({}).status).toBe(200)
  })

  it('uses the given status', () => {
    expect(jsonResponse({}, 201).status).toBe(201)
  })

  it('serializes the body as JSON', async () => {
    expect(await jsonResponse({ amountInCents: 1 }).json()).toEqual({ amountInCents: 1 })
  })

  it('sets the standard headers', () => {
    const { headers } = jsonResponse({})

    expect(headers.get('Content-Type')).toBe('application/json')
    expect(headers.get('Cache-Control')).toBe('no-store')
  })
})

describe('noContentResponse', () => {
  it('answers 204 with no body and no Content-Type', () => {
    const response = noContentResponse()

    expect(response.status).toBe(204)
    expect(response.body).toBeNull()
    expect(response.headers.get('Content-Type')).toBeNull()
    expect(response.headers.get('Cache-Control')).toBe('no-store')
  })
})
