export const TRANSACTION_TYPES = [
  'deposit',
  'withdrawal',
  'transfer',
  'payment',
  'currency_exchange',
  'doc_ted',
  'loan',
] as const

export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export type TransactionDirection = 'income' | 'expense'

// Assumptions behind the non-obvious entries are recorded in docs/adr/0003
const DIRECTIONS: Record<TransactionType, TransactionDirection> = {
  deposit: 'income',
  loan: 'income',
  withdrawal: 'expense',
  payment: 'expense',
  transfer: 'expense',
  doc_ted: 'expense',
  currency_exchange: 'expense',
}

export function isTransactionType(value: string): value is TransactionType {
  return (TRANSACTION_TYPES as readonly string[]).includes(value)
}

export function transactionDirection(type: TransactionType): TransactionDirection {
  return DIRECTIONS[type]
}
