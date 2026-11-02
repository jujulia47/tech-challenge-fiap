import { getAccountHandlers } from '@bytebank/auth/handlers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function POST(request: Request) {
  return getAccountHandlers().changePassword(request)
}
