import { CalendarDate } from '../value-objects/CalendarDate'
import { Money } from '../value-objects/Money'
import type { Transaction } from './Transaction'
import { TRANSACTION_TYPES, type TransactionType } from './TransactionType'

export type PeriodInMonths = 3 | 6 | 'all'

export interface MonthGroup {
  monthKey: string
  transactions: Transaction[]
}

export interface MonthTotal {
  monthKey: string
  amountInCents: number
}

export interface TypeTotal {
  type: TransactionType
  amountInCents: number
}

// Newest date first; ties break on id (plain string order, independent of locale)
function compareNewestFirst(a: Transaction, b: Transaction): number {
  const byDate = b.date.compare(a.date)
  if (byDate !== 0) return byDate
  if (a.id === b.id) return 0
  return a.id < b.id ? 1 : -1
}

export function sortNewestFirst(transactions: readonly Transaction[]): Transaction[] {
  return [...transactions].sort(compareNewestFirst)
}

export function groupByMonth(transactions: readonly Transaction[]): MonthGroup[] {
  const groups = new Map<string, Transaction[]>()
  for (const transaction of sortNewestFirst(transactions)) {
    const key = transaction.monthKey()
    groups.set(key, [...(groups.get(key) ?? []), transaction])
  }
  return [...groups].map(([monthKey, items]) => ({ monthKey, transactions: items }))
}

export function filterByPeriod(
  transactions: readonly Transaction[],
  months: PeriodInMonths,
  today: CalendarDate,
): Transaction[] {
  if (months === 'all') return [...transactions]
  const start = today.subtractMonths(months)
  return transactions.filter(transaction => !transaction.date.isBefore(start))
}

function sumMagnitudes(transactions: readonly Transaction[]): number {
  return transactions.reduce((total, transaction) => total.add(transaction.amount), Money.zero()).toCents()
}

// Charts show volume: magnitudes, regardless of direction. The balance uses signed amounts.
export function totalsByMonth(transactions: readonly Transaction[]): MonthTotal[] {
  return groupByMonth(transactions)
    .reverse()
    .map(group => ({ monthKey: group.monthKey, amountInCents: sumMagnitudes(group.transactions) }))
}

export function totalsByType(transactions: readonly Transaction[]): TypeTotal[] {
  return TRANSACTION_TYPES.flatMap(type => {
    const ofType = transactions.filter(transaction => transaction.type === type)
    return ofType.length > 0 ? [{ type, amountInCents: sumMagnitudes(ofType) }] : []
  })
}
