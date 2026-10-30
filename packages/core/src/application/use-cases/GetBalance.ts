import { Money } from '../../domain/value-objects/Money'
import type { TransactionRepository } from '../ports/TransactionRepository'

export interface BalanceDTO {
  amountInCents: number
}

export class GetBalance {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(userId: string): Promise<BalanceDTO> {
    const transactions = await this.transactions.findAllByUser(userId)
    const balance = transactions.reduce((total, transaction) => total.add(transaction.signedAmount()), Money.zero())
    return { amountInCents: balance.toCents() }
  }
}
