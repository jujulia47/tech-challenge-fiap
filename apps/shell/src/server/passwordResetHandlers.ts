import { after } from 'next/server'
import { createPasswordResetHandlers, type PasswordResetHandlers } from '@bytebank/bff'
import { parseAllowedOrigins, requireEnv } from '@bytebank/bff/env'
import { getAuthUseCases } from '@/server/authUseCases'

const logger = {
  // console.error on purpose: this module only runs on the server, so this goes to the server log
  error: (error: unknown) => console.error(error),
}

export function getPasswordResetHandlers(): PasswordResetHandlers {
  const { requestPasswordReset, resetPassword } = getAuthUseCases()
  return createPasswordResetHandlers({
    requestPasswordReset,
    resetPassword,
    allowedOrigins: parseAllowedOrigins(requireEnv('ALLOWED_ORIGINS')),
    defer: after,
    logger,
  })
}
