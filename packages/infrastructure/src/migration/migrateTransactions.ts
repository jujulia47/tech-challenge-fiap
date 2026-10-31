import { CalendarDate, Transaction } from '@bytebank/core'
import { InfrastructureError } from '../errors/InfrastructureError'
import type { TransactionRecord } from '../json-server/TransactionRecord'
import { idOf, parseTransactionRecord, recordFromPrimitives } from '../json-server/transactionRecordMapper'
import { LEGACY_LABEL_TO_TYPE, parseLegacyTransaction, type LegacyTransaction } from './legacyTransaction'

const AMOUNT = /^\s*(-?)\s*R\$\s*(\d{1,3}(?:\.\d{3})+|\d+),(\d{2})\s*$/
const LEGACY_DATE = /^(\d{2})\/(\d{2})\/(\d{4})$/

export interface MigrationError {
  id: string
  message: string
}

export interface MigrationResult {
  transactions: TransactionRecord[]
  errors: MigrationError[]
  summary: {
    total: number
    migrated: number
    alreadyMigrated: number
    errors: number
  }
}

function parseAmountInCents(amount: string): number {
  const match = AMOUNT.exec(amount)
  if (!match) throw new InfrastructureError(`Invalid amount: "${amount}"`)
  const [, sign, whole, cents] = match
  if (sign === '-') {
    throw new InfrastructureError('negative amount: the domain stores magnitudes; review this record manually')
  }
  return Number(whole.replace(/\./g, '') + cents)
}

function parseLegacyDate(date: string): string {
  const match = LEGACY_DATE.exec(date)
  if (!match) throw new InfrastructureError(`Invalid date: "${date}"`)
  return CalendarDate.fromParts(Number(match[3]), Number(match[2]), Number(match[1])).toISO()
}

function typeFromLabel(label: string): string {
  const type = LEGACY_LABEL_TO_TYPE.get(label)
  if (type === undefined) throw new InfrastructureError(`Unknown label: "${label}"`)
  return type
}

function fromLegacy(legacy: LegacyTransaction, userId: string): TransactionRecord {
  const transaction = Transaction.fromPrimitives({
    id: legacy.id,
    userId,
    type: typeFromLabel(legacy.label),
    amountInCents: parseAmountInCents(legacy.amount),
    date: parseLegacyDate(legacy.transactionDate ?? legacy.date),
    attachment: legacy.attachment,
  })
  return recordFromPrimitives(transaction.toPrimitives())
}

function validated(record: TransactionRecord): TransactionRecord {
  return recordFromPrimitives(Transaction.fromPrimitives(record).toPrimitives())
}

function isNewFormat(value: object): boolean {
  return 'amountInCents' in value
}

// Pure: reports invalid records instead of stopping, so one run shows every problem
export function migrateTransactions(records: readonly unknown[], userId: string): MigrationResult {
  const result: MigrationResult = {
    transactions: [],
    errors: [],
    summary: { total: records.length, migrated: 0, alreadyMigrated: 0, errors: 0 },
  }

  for (const record of records) {
    try {
      if (typeof record !== 'object' || record === null) {
        throw new InfrastructureError('Record is not an object')
      }
      if (isNewFormat(record)) {
        result.transactions.push(validated(parseTransactionRecord(record)))
        result.summary.alreadyMigrated += 1
      } else {
        const legacy = parseLegacyTransaction(record as Record<string, unknown>)
        result.transactions.push(fromLegacy(legacy, userId))
        result.summary.migrated += 1
      }
    } catch (error) {
      result.errors.push({ id: idOf(record), message: (error as Error).message })
      result.summary.errors += 1
    }
  }
  return result
}
