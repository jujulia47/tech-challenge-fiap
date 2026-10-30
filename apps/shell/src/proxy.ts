import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// /dashboard and /transactions are protected zones proxied to their micro-frontends
// via beforeFiles rewrites in next.config.ts. This proxy only guards auth:
//   - NOT authenticated + path is a protected zone  -> redirect to /
//   - otherwise                                      -> pass through, so the
//     beforeFiles rewrite proxies the request to the zone (do NOT redirect)
// Public routes (/, /forgot-password, /api/auth/*) aren't in the matcher, so this
// never runs on them.
export default auth((req) => {
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

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/transactions', '/transactions/:path*'],
}
