import { parseAllowedOrigins, requireEnv } from '../env'
import { createTransactionHandlers, type TransactionHandlers } from '../http/createTransactionHandlers'
import { createJsonServerUseCases } from './createJsonServerUseCases'

const logger = {
  // console.error on purpose: this only runs on the server, so this goes to the server log
  error: (error: unknown) => console.error(error),
}

// The handlers of a zone, built on the first request: `next build` loads the routes,
// and it must not need these variables. Who is logged in comes from outside, so the bff
// stays free of Next and of NextAuth.
export function createLazyTransactionHandlers(getUserId: () => Promise<string | null>): () => TransactionHandlers {
  let handlers: TransactionHandlers | undefined

  return () => {
    handlers ??= createTransactionHandlers({
      getUserId,
      useCases: createJsonServerUseCases({
        baseUrl: requireEnv('JSON_SERVER_URL'),
        attachmentKey: requireEnv('ATTACHMENT_ENCRYPTION_KEY'),
        logger,
      }),
      allowedOrigins: parseAllowedOrigins(requireEnv('ALLOWED_ORIGINS')),
      logger,
    })
    return handlers
  }
}
