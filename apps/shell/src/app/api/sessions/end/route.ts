import { createEndSessionsHandler, getSessionRevocation } from '@bytebank/bff'
import { parseAllowedOrigins, requireEnv } from '@bytebank/bff/env'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const logger = {
  // console.error on purpose: this route only runs on the server, so this goes to the server log
  error: (error: unknown) => console.error(error),
}

// "Sair" of the menu, in the three apps (they share this origin): every session of the user ends.
// The inactivity logout does not call it, so it only clears the cookie of its own browser.
export function POST(request: Request) {
  const endSessions = createEndSessionsHandler({
    getUserId: async () => (await auth())?.user?.id ?? null,
    endAll: userId => getSessionRevocation().endAll(userId),
    allowedOrigins: parseAllowedOrigins(requireEnv('ALLOWED_ORIGINS')),
    logger,
  })
  return endSessions(request)
}
