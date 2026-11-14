import 'server-only'
import { requireEnv } from '@bytebank/bff/env'
import { withContentSecurityPolicy } from '@bytebank/utils'
import { NextResponse } from 'next/server'
import { keepingSessionOutOfRsc } from './rscSessionCookies'
import { auth } from './zone'

// Protects the pages of a zone even when the shell is bypassed. Redirects to the shell,
// where the login is: a relative "/" would stay inside the basePath of the zone.
// The matcher stays in the proxy.ts of each zone, because Next reads it from that file.
// Its RSC responses never renew the session: see rscSessionCookies.ts
export const zoneProxy = keepingSessionOutOfRsc(auth((req) => {
  // Require a user, not just an auth object: same criterion as apps/shell/src/proxy.ts
  if (!req.auth?.user) return NextResponse.redirect(requireEnv('SHELL_URL'))

  const { requestHeaders, policy } = withContentSecurityPolicy(req.headers)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', policy)
  return response
}))
