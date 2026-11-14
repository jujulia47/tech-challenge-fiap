import type { Logger } from './createTransactionHandlers'
import { forbiddenOriginResponse, toErrorResponse, unauthenticatedResponse } from './errors'
import { isAllowedOrigin } from './origin'
import { noContentResponse } from './responses'

export interface EndSessionsHandlerOptions {
  getUserId: (request: Request) => Promise<string | null>
  // Records now as the moment every current session of the user ends
  endAll: (userId: string) => Promise<void>
  allowedOrigins: readonly string[]
  logger?: Logger
}

// "Sair" of the menu: ends every session of the user, on every device, before the browser clears
// its own cookie. The logout of the inactivity guard does not come here: it only clears the
// cookie of its browser (docs/fase4/security.md, "Ending every session").
export function createEndSessionsHandler({ getUserId, endAll, allowedOrigins, logger }: EndSessionsHandlerOptions) {
  return async function endSessions(request: Request): Promise<Response> {
    // Before the session: a forged cross-site request cannot log the person out everywhere
    if (!isAllowedOrigin(request, allowedOrigins)) return forbiddenOriginResponse()
    try {
      const userId = await getUserId(request)
      if (!userId) return unauthenticatedResponse()
      await endAll(userId)
      return noContentResponse()
    } catch (error) {
      logger?.error(error)
      return toErrorResponse(error)
    }
  }
}
