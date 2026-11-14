import { describe, expect, it } from 'vitest'
import { isRouterFetch, keepingSessionOutOfRsc, withoutSessionRenewal } from './rscSessionCookies'

const SESSION = '__Secure-authjs.session-token=eyJhbGciOi.renewed; Path=/; Expires=Fri, 14 Nov 2026 16:00:00 GMT; HttpOnly; Secure; SameSite=Lax'
const CHUNK = '__Secure-authjs.session-token.0=eyJhbGciOi.part; Path=/; HttpOnly; Secure; SameSite=Lax'
const LOCAL = 'authjs.session-token=eyJhbGciOi.renewed; Path=/; HttpOnly; SameSite=Lax'
const CLEARED = '__Secure-authjs.session-token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax'
const CALLBACK = '__Secure-authjs.callback-url=https%3A%2F%2Fbytebank.test; Path=/; Secure; SameSite=Lax'

function responseWith(...cookies: string[]): Response {
  const headers = new Headers({ 'content-type': 'text/x-component' })
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return new Response('rsc payload', { headers })
}

const request = (headers: Record<string, string> = {}) => new Request('https://bytebank.test/dashboard/services?_rsc=abc', { headers })

describe('isRouterFetch', () => {
  it('tells a fetch from a page load by Sec-Fetch-Dest, which Next leaves on the request', () => {
    expect(isRouterFetch(new Headers({ 'Sec-Fetch-Dest': 'empty' }))).toBe(true)
    expect(isRouterFetch(new Headers({ 'Sec-Fetch-Dest': 'document' }))).toBe(false)
    expect(isRouterFetch(new Headers({ 'Sec-Fetch-Dest': 'iframe' }))).toBe(false)
  })

  it('trusts Sec-Fetch-Dest over the RSC headers', () => {
    expect(isRouterFetch(new Headers({ 'Sec-Fetch-Dest': 'document', RSC: '1' }))).toBe(false)
  })

  it('falls back to the RSC headers without Fetch Metadata, and treats the rest as a page load', () => {
    expect(isRouterFetch(new Headers({ RSC: '1' }))).toBe(true)
    expect(isRouterFetch(new Headers({ 'Next-Router-Prefetch': '1' }))).toBe(true)
    expect(isRouterFetch(new Headers({ accept: 'text/html' }))).toBe(false)
  })
})

describe('withoutSessionRenewal', () => {
  it('drops the renewed session cookie, chunks and local names included, from an RSC response', () => {
    const response = withoutSessionRenewal(request({ 'Sec-Fetch-Dest': 'empty' }), responseWith(CALLBACK, SESSION, CHUNK, LOCAL))

    expect(response.headers.getSetCookie()).toEqual([CALLBACK])
  })

  it('keeps a session cookie being cleared', () => {
    const response = withoutSessionRenewal(request({ 'Sec-Fetch-Dest': 'empty' }), responseWith(CLEARED))

    expect(response.headers.getSetCookie()).toEqual([CLEARED])
  })

  it('leaves a page load alone: it still renews the session', () => {
    const response = withoutSessionRenewal(request({ 'Sec-Fetch-Dest': 'document' }), responseWith(SESSION))

    expect(response.headers.getSetCookie()).toEqual([SESSION])
  })

  it('keeps the body, the status and the other headers', async () => {
    const response = withoutSessionRenewal(request({ 'Sec-Fetch-Dest': 'empty' }), responseWith(SESSION))

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/x-component')
    expect(await response.text()).toBe('rsc payload')
  })
})

describe('keepingSessionOutOfRsc', () => {
  it('filters what the wrapped proxy answers, and passes an empty answer through', async () => {
    const wrapped = keepingSessionOutOfRsc(async () => responseWith(SESSION))
    const empty = keepingSessionOutOfRsc(() => undefined)

    const response = await wrapped(request({ 'Sec-Fetch-Dest': 'empty' }), {})

    expect(response?.headers.getSetCookie()).toEqual([])
    expect(await empty(request(), {})).toBeUndefined()
  })
})
