import type { ChangePassword, UpdateUserProfile } from '@bytebank/core'
import type { Logger } from './createTransactionHandlers'
import { forbiddenOriginResponse, toErrorResponse, unauthenticatedResponse } from './errors'
import { isAllowedOrigin } from './origin'
import { readJson } from './readJson'
import { jsonResponse, noContentResponse } from './responses'
import { changePasswordBodySchema, profileBodySchema } from './schemas'

export interface AccountHandlersOptions {
  getUserId: (request: Request) => Promise<string | null>
  updateUserProfile: Pick<UpdateUserProfile, 'execute'>
  changePassword: Pick<ChangePassword, 'execute'>
  allowedOrigins: readonly string[]
  logger?: Logger
}

export interface AccountHandlers {
  updateProfile(request: Request): Promise<Response>
  changePassword(request: Request): Promise<Response>
}

// The user is always the one of the session: the body has no id, and an extra field is refused
export function createAccountHandlers({
  getUserId,
  updateUserProfile,
  changePassword,
  allowedOrigins,
  logger,
}: AccountHandlersOptions): AccountHandlers {
  async function write(request: Request, action: (userId: string) => Promise<Response>): Promise<Response> {
    // Before the session: a forged cross-site request learns nothing
    if (!isAllowedOrigin(request, allowedOrigins)) return forbiddenOriginResponse()
    try {
      const userId = await getUserId(request)
      if (!userId) return unauthenticatedResponse()
      return await action(userId)
    } catch (error) {
      logger?.error(error)
      return toErrorResponse(error)
    }
  }

  return {
    updateProfile: request =>
      write(request, async userId => {
        const { name } = profileBodySchema.parse(await readJson(request))
        const user = await updateUserProfile.execute({ userId, name })
        // The name only: the id and the email are already known to the screen
        return jsonResponse({ name: user.name })
      }),

    changePassword: request =>
      write(request, async userId => {
        const body = changePasswordBodySchema.parse(await readJson(request))
        await changePassword.execute({ userId, ...body })
        return noContentResponse()
      }),
  }
}
