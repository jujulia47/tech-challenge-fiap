import { getTransactionHandlers } from '@/server/transactionHandlers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export function GET(request: Request) {
  return getTransactionHandlers().listTransactions(request)
}

export function POST(request: Request) {
  return getTransactionHandlers().createTransaction(request)
}
