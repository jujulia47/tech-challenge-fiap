import 'server-only'
import { createJsonServerUseCases, createTransactionHandlers, type TransactionHandlers } from '@bytebank/bff'
import { parseAllowedOrigins, requireEnv } from '@bytebank/bff/env'
import { auth } from '@/lib/auth'

const logger = {
  // console.error on purpose: this module only runs on the server, so this goes to the server log
  error: (error: unknown) => console.error(error),
}

let handlers: TransactionHandlers | undefined

// Built on the first request: `next build` loads the routes, and it must not need these variables
export function getTransactionHandlers(): TransactionHandlers {
  handlers ??= createTransactionHandlers({
    getUserId: async () => (await auth())?.user?.id ?? null,
    useCases: createJsonServerUseCases({ baseUrl: requireEnv('JSON_SERVER_URL') }),
    allowedOrigins: parseAllowedOrigins(requireEnv('ALLOWED_ORIGINS')),
    logger,
  })
  return handlers
}
