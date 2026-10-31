import { ApplicationError, type RegisterUser } from '@bytebank/core'
import { clientIp } from './clientIp'
import type { Logger } from './createTransactionHandlers'
import { forbiddenOriginResponse, toErrorResponse } from './errors'
import { isAllowedOrigin } from './origin'
import { readJson } from './readJson'
import { jsonResponse } from './responses'
import { registerBodySchema } from './schemas'

export interface RegisterHandlerOptions {
  registerUser: Pick<RegisterUser, 'execute'>
  allowedOrigins: readonly string[]
  logger?: Logger
}

// A new email and a registered one get the same answer, so this route does not tell
// which emails exist. The user is never in the body, for the same reason.
const accepted = () => jsonResponse({ status: 'ACCEPTED' }, 202)

export function createRegisterHandler({ registerUser, allowedOrigins, logger }: RegisterHandlerOptions) {
  return async function register(request: Request): Promise<Response> {
    if (!isAllowedOrigin(request, allowedOrigins)) return forbiddenOriginResponse()
    try {
      const body = registerBodySchema.parse(await readJson(request))
      await registerUser.execute({ ...body, ip: clientIp(request.headers) })
      return accepted()
    } catch (error) {
      if (error instanceof ApplicationError && error.code === 'EMAIL_ALREADY_REGISTERED') return accepted()
      logger?.error(error)
      return toErrorResponse(error)
    }
  }
}
