import { requireEnv } from '@bytebank/bff/env'
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

// Protects the pages of this zone even when the shell is bypassed. Redirects to the shell,
// where the login is: a relative "/" would stay inside the basePath of the zone.
// /api/* is outside the matcher: the handlers answer 401 in JSON, and NextAuth stays reachable.
export default auth((req) => {
  // Require a user, not just an auth object: same criterion as apps/shell/src/proxy.ts
  if (!req.auth?.user) return NextResponse.redirect(requireEnv('SHELL_URL'))

  return NextResponse.next()
})

// Next prefixes the matcher with the basePath, so the second pattern needs a slash after it and
// does not cover the root of the zone: without the explicit '/', that page would stay open
export const config = {
  matcher: ['/', '/((?!api/|_next/static|_next/image|favicon.ico).*)'],
}
