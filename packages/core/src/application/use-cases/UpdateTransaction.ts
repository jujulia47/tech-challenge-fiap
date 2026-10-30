import type { TransactionChanges } from '../../domain/transaction/Transaction'
import type { TransactionType } from '../../domain/transaction/TransactionType'
import { CalendarDate } from '../../domain/value-objects/CalendarDate'
import { Money } from '../../domain/value-objects/Money'
import { ApplicationError } from '../errors/ApplicationError'
import type { Clock } from '../ports/Clock'
import type { TransactionRepository } from '../ports/TransactionRepository'
import type { TransactionDTO } from '../TransactionDTO'
import { assertDateNotInFuture } from './assertDateNotInFuture'

export interface UpdateTransactionInput {
  id: string
  userId: string
  // An explicit `attachment: undefined` removes the attachment; an absent key keeps it
  changes: {
    type?: string
    amountInCents?: number
    date?: string
    attachment?: string
  }
}

function toDomainChanges(changes: UpdateTransactionInput['changes']): TransactionChanges {
  const domainChanges: TransactionChanges = {}
  // Transaction.update() rejects anything that is not a TransactionType
  if (changes.type !== undefined) domainChanges.type = changes.type as TransactionType
  if (changes.amountInCents !== undefined) domainChanges.amount = Money.fromCents(changes.amountInCents)
  if (changes.date !== undefined) domainChanges.date = CalendarDate.fromISO(changes.date)
  if ('attachment' in changes) domainChanges.attachment = changes.attachment
  return domainChanges
}

export class UpdateTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
  ) {}

  async execute({ id, userId, changes }: UpdateTransactionInput): Promise<TransactionDTO> {
    const current = await this.transactions.findById(id, userId)
    if (!current) throw new ApplicationError('TRANSACTION_NOT_FOUND', `Transaction not found: ${id}`)

    const updated = current.update(toDomainChanges(changes))
    if (!updated.date.equals(current.date)) assertDateNotInFuture(updated.date, this.clock)

    await this.transactions.update(updated)
    return updated.toPrimitives()
  }
}
