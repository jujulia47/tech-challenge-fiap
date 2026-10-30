import { Transaction } from '../../domain/transaction/Transaction'
import type { Clock } from '../ports/Clock'
import type { IdGenerator } from '../ports/IdGenerator'
import type { TransactionRepository } from '../ports/TransactionRepository'
import type { TransactionDTO } from '../TransactionDTO'
import { assertDateNotInFuture } from './assertDateNotInFuture'

export interface CreateTransactionInput {
  userId: string
  type: string
  amountInCents: number
  date: string
  attachment?: string
}

export class CreateTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly clock: Clock,
    private readonly ids: IdGenerator,
  ) {}

  async execute(input: CreateTransactionInput): Promise<TransactionDTO> {
    const transaction = Transaction.fromPrimitives({ ...input, id: this.ids.next() })
    assertDateNotInFuture(transaction.date, this.clock)
    const created = await this.transactions.create(transaction)
    return created.toPrimitives()
  }
}
