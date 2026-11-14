// The auth() wrapper of next-auth reads the session on every request of a proxy and, with JWT
// sessions, writes the renewed cookie on the response. The router of Next prefetches the links
// of a page with RSC fetches; one that left before a logout and answers after it wrote the old
// session back (docs/fase4/security.md, "The session race"). So a fetch of the router never
// renews the session: full page loads and the reads of the session do, and a cookie being
// cleared still goes.

const SESSION_COOKIE = /^(__Secure-)?authjs\.session-token(\.\d+)?=/

// Next removes its RSC headers (RSC, Next-Router-Prefetch) and the _rsc parameter before the
// proxy sees the request. Fetch Metadata stays: the browser sets Sec-Fetch-Dest, which the page
// cannot forge, to "document" on a page load and to "empty" on a fetch. The RSC headers are the
// fallback for a client that sends no Fetch Metadata, in case Next ever passes them on.
export function isRouterFetch(headers: Headers): boolean {
  const destination = headers.get('sec-fetch-dest')
  if (destination !== null) return destination !== 'document' && destination !== 'iframe'
  return headers.get('rsc') === '1' || headers.has('next-router-prefetch')
}

function clears(cookie: string): boolean {
  const [pair, ...attributes] = cookie.split(';').map(part => part.trim().toLowerCase())
  return pair.endsWith('=') || attributes.some(attribute => attribute === 'max-age=0' || attribute.startsWith('expires=thu, 01 jan 1970'))
}

export function withoutSessionRenewal(request: Request, response: Response): Response {
  if (!isRouterFetch(request.headers)) return response
  const cookies = response.headers.getSetCookie()
  const kept = cookies.filter(cookie => !SESSION_COOKIE.test(cookie) || clears(cookie))
  if (kept.length === cookies.length) return response
  response.headers.delete('set-cookie')
  for (const cookie of kept) response.headers.append('set-cookie', cookie)
  return response
}

// Wraps a proxy (the result of auth(...)) so that its answers to the router never renew the session
export function keepingSessionOutOfRsc<R extends Request, C>(
  proxy: (request: R, context: C) => void | Response | Promise<void | Response>,
): (request: R, context: C) => Promise<void | Response> {
  return async (request, context) => {
    const response = await proxy(request, context)
    return response ? withoutSessionRenewal(request, response) : response
  }
}
