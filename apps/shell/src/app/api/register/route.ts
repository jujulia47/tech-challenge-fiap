import { createRegisterHandler } from '@bytebank/bff'
import { parseAllowedOrigins, requireEnv } from '@bytebank/bff/env'
import { getAuthUseCases } from '@/server/authUseCases'

export const dynamic = 'force-dynamic'

const logger = {
  // console.error on purpose: this route only runs on the server, so this goes to the server log
  error: (error: unknown) => console.error(error),
}

export function POST(request: Request) {
  const register = createRegisterHandler({
    registerUser: getAuthUseCases().registerUser,
    allowedOrigins: parseAllowedOrigins(requireEnv('ALLOWED_ORIGINS')),
    logger,
  })
  return register(request)
}
