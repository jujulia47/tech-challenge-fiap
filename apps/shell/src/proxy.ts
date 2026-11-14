import { auth } from '@/lib/auth'
import { keepingSessionOutOfRsc } from '@bytebank/auth'
import { withContentSecurityPolicy } from '@bytebank/utils'
import { NextResponse } from 'next/server'

// /dashboard and /transactions are protected zones proxied to their micro-frontends
// via beforeFiles rewrites in next.config.ts. This proxy only guards auth:
//   - NOT authenticated + path is a protected zone  -> redirect to /
//   - otherwise                                      -> pass through, so the
//     beforeFiles rewrite proxies the request to the zone (do NOT redirect)
// The public pages get their Content-Security-Policy here. The zones send their own:
// a second policy with another nonce would block their scripts.
// APIs and static files aren't in the matcher. The zone APIs answer 401 in JSON,
// and a redirect would hand HTML to a client that expects JSON.
// The RSC prefetches of the zones pass here too: they never renew the session (see
// keepingSessionOutOfRsc in @bytebank/auth, and docs/fase4/security.md, "The session race")
export default keepingSessionOutOfRsc(auth((req) => {
  const { nextUrl } = req
  // Require a user, not just an auth object: an auth object can be populated
  // with an error and fail open (defense in depth, GHSA-8fpg-xm3f-6cx3)
  const isAuthenticated = !!req.auth?.user

  const isProtected =
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/transactions')

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/', nextUrl))
  }

  if (isProtected) return NextResponse.next()

  const { requestHeaders, policy } = withContentSecurityPolicy(req.headers)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', policy)
  return response
}))

export const config = {
  matcher: ['/((?!api/|dashboard/api/|transactions/api/|_next/static|_next/image|.*\\.\\w+$).*)'],
}
