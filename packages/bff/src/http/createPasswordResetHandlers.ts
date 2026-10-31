import type { RequestPasswordReset, ResetPassword } from '@bytebank/core'
import { clientIp } from './clientIp'
import type { Logger } from './createTransactionHandlers'
import { forbiddenOriginResponse, toErrorResponse } from './errors'
import { isAllowedOrigin } from './origin'
import { readJson } from './readJson'
import { jsonResponse, noContentResponse } from './responses'
import { passwordResetConfirmSchema, passwordResetRequestSchema } from './schemas'

export interface PasswordResetHandlersOptions {
  requestPasswordReset: Pick<RequestPasswordReset, 'execute'>
  resetPassword: Pick<ResetPassword, 'execute'>
  allowedOrigins: readonly string[]
  // Runs a task after the answer. Next.js has after() for this.
  defer?: (task: () => Promise<void>) => void
  logger?: Logger
}

export interface PasswordResetHandlers {
  request(request: Request): Promise<Response>
  confirm(request: Request): Promise<Response>
}

export function createPasswordResetHandlers({
  requestPasswordReset,
  resetPassword,
  allowedOrigins,
  defer = task => void task(),
  logger,
}: PasswordResetHandlersOptions): PasswordResetHandlers {
  async function withAllowedOrigin(request: Request, action: () => Promise<Response>): Promise<Response> {
    if (!isAllowedOrigin(request, allowedOrigins)) return forbiddenOriginResponse()
    try {
      return await action()
    } catch (error) {
      logger?.error(error)
      return toErrorResponse(error)
    }
  }

  return {
    request: request =>
      withAllowedOrigin(request, async () => {
        const { email } = passwordResetRequestSchema.parse(await readJson(request))
        const ip = clientIp(request.headers)
        // After the answer: sending an email takes time, and that time would tell which emails exist
        defer(() => requestPasswordReset.execute({ email, ip }).catch(error => logger?.error(error)))
        return jsonResponse({ status: 'ACCEPTED' }, 202)
      }),

    confirm: request =>
      withAllowedOrigin(request, async () => {
        await resetPassword.execute(passwordResetConfirmSchema.parse(await readJson(request)))
        return noContentResponse()
      }),
  }
}
