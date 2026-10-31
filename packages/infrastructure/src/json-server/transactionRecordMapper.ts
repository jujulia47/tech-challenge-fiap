import { Transaction, type TransactionPrimitives } from '@bytebank/core'
import { InfrastructureError } from '../errors/InfrastructureError'
import type { TransactionRecord } from './TransactionRecord'

function isRecordShape(value: unknown): value is TransactionRecord {
  if (typeof value !== 'object' || value === null) return false
  const record = value as Record<string, unknown>
  return (
    typeof record.id === 'string' &&
    typeof record.userId === 'string' &&
    typeof record.type === 'string' &&
    typeof record.amountInCents === 'number' &&
    typeof record.date === 'string' &&
    (record.attachment === undefined || typeof record.attachment === 'string')
  )
}

export function idOf(value: unknown): string {
  const id = (value as { id?: unknown } | null)?.id
  return typeof id === 'string' ? id : '(no id)'
}

// Keeps known fields only, so stray keys in the database never reach the domain
export function parseTransactionRecord(value: unknown): TransactionRecord {
  if (!isRecordShape(value)) {
    throw new InfrastructureError('Stored transaction does not match the expected format')
  }
  const { id, userId, type, amountInCents, date, attachment } = value
  return { id, userId, type, amountInCents, date, ...(attachment === undefined ? {} : { attachment }) }
}

export function recordFromPrimitives(primitives: TransactionPrimitives): TransactionRecord {
  return { ...primitives }
}

// Invalid stored data becomes an error here and never enters the application. It is a
// failure of the data, not of the caller, so a DomainError must not escape from this read.
export function transactionFromRecord(value: unknown): Transaction {
  try {
    return Transaction.fromPrimitives(parseTransactionRecord(value))
  } catch (error) {
    throw new InfrastructureError(`Stored transaction is invalid: ${idOf(value)}`, {
      code: 'CORRUPTED_RECORD',
      cause: error,
    })
  }
}
