import { groupByMonth } from '../../domain/transaction/aggregations'
import type { TransactionRepository } from '../ports/TransactionRepository'
import type { TransactionDTO } from '../TransactionDTO'

export interface StatementDTO {
  groups: Array<{ monthKey: string; transactions: TransactionDTO[] }>
}

export class GetStatement {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(userId: string): Promise<StatementDTO> {
    const transactions = await this.transactions.findAllByUser(userId)
    return {
      groups: groupByMonth(transactions).map(group => ({
        monthKey: group.monthKey,
        transactions: group.transactions.map(transaction => transaction.toPrimitives()),
      })),
    }
  }
}
