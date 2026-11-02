import type { TransactionType } from './TransactionType'

// R$ 1.000,00 or more looks like money coming in; less looks like a bill being paid
export const DEPOSIT_SUGGESTION_MIN_CENTS = 100_000

// A hint for a form with no type chosen yet. Nothing is decided by it.
export function suggestTransactionType(amountInCents: number): TransactionType | null {
  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) return null
  return amountInCents >= DEPOSIT_SUGGESTION_MIN_CENTS ? 'deposit' : 'payment'
}
