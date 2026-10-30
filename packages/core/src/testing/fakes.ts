import type { Clock } from '../application/ports/Clock'
import type { IdGenerator } from '../application/ports/IdGenerator'
import { Transaction } from '../domain/transaction/Transaction'
import { CalendarDate } from '../domain/value-objects/CalendarDate'

export class FixedClock implements Clock {
  private readonly date: CalendarDate

  constructor(isoDate: string) {
    this.date = CalendarDate.fromISO(isoDate)
  }

  today(): CalendarDate {
    return this.date
  }
}

export class SequentialIdGenerator implements IdGenerator {
  private current = 0

  next(): string {
    this.current += 1
    return `id-${this.current}`
  }
}

interface TransactionOverrides {
  id?: string
  userId?: string
  type?: string
  amountInCents?: number
  date?: string
  attachment?: string
}

export function aTransaction(overrides: TransactionOverrides = {}): Transaction {
  return Transaction.fromPrimitives({
    id: '1',
    userId: 'user-a',
    type: 'deposit',
    amountInCents: 15000,
    date: '2022-11-18',
    ...overrides,
  })
}
