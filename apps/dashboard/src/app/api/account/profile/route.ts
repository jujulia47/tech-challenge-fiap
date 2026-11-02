import { getAccountHandlers } from '@bytebank/auth/handlers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function PATCH(request: Request) {
  return getAccountHandlers().updateProfile(request)
}
