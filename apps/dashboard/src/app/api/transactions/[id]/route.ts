import { getTransactionHandlers } from '@/server/transactionHandlers'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface TransactionRouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: TransactionRouteContext) {
  const { id } = await params
  return getTransactionHandlers().updateTransaction(request, id)
}

export async function DELETE(request: Request, { params }: TransactionRouteContext) {
  const { id } = await params
  return getTransactionHandlers().deleteTransaction(request, id)
}
