import { sortNewestFirst } from '../../domain/transaction/aggregations'
import type { TransactionRepository } from '../ports/TransactionRepository'
import type { TransactionDTO } from '../TransactionDTO'

export class ListTransactions {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(userId: string): Promise<TransactionDTO[]> {
    const transactions = await this.transactions.findAllByUser(userId)
    return sortNewestFirst(transactions).map(transaction => transaction.toPrimitives())
  }
}
