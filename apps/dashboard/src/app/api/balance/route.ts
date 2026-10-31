import { getTransactionHandlers } from '@/server/transactionHandlers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET(request: Request) {
  return getTransactionHandlers().getBalance(request)
}
