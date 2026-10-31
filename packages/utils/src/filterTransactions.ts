import { transactionDirection, type TransactionDTO } from '@bytebank/core'
import { TRANSACTION_TYPE_LABELS, formatDateBR, formatSignedCents } from './transactionPresentation'

export interface StatementFilters {
  type: string
  month: string
}

export interface StatementQuery extends StatementFilters {
  text: string
}

function matchesFilters({ type, date }: TransactionDTO, filters: StatementFilters): boolean {
  return (!filters.type || type === filters.type) && (!filters.month || date.startsWith(filters.month))
}

// The label ignores case. The amount and the date are compared as they appear on the screen.
function matchesText({ type, amountInCents, date }: TransactionDTO, text: string): boolean {
  return (
    TRANSACTION_TYPE_LABELS[type].toLowerCase().includes(text.toLowerCase()) ||
    formatSignedCents(amountInCents, transactionDirection(type)).includes(text) ||
    formatDateBR(date).includes(text)
  )
}

export function filterTransactions(
  transactions: readonly TransactionDTO[],
  { text, ...filters }: StatementQuery,
): TransactionDTO[] {
  const searched = text.trim() !== ''
  return transactions.filter(
    transaction => matchesFilters(transaction, filters) && (!searched || matchesText(transaction, text)),
  )
}
