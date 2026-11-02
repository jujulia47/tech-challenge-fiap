import { getTransactionHandlers } from '@bytebank/auth/handlers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET(request: Request) {
  return getTransactionHandlers().getStatement(request)
}
