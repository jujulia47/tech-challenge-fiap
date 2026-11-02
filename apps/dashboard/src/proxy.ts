import { zoneProxy } from '@bytebank/auth/zoneProxy'

export default zoneProxy

// Next reads the matcher from this file, so it stays here. Next prefixes it with the basePath,
// so the second pattern needs a slash after it and does not cover the root of the zone:
// without the explicit '/', that page would stay open. /api/* is outside: the handlers
// answer 401 in JSON, and NextAuth stays reachable.
export const config = {
  matcher: ['/', '/((?!api/|_next/static|_next/image|favicon.ico).*)'],
}
