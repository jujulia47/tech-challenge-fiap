import { ApplicationError } from '../errors/ApplicationError'
import type { TransactionRepository } from '../ports/TransactionRepository'

export interface DeleteTransactionInput {
  id: string
  userId: string
}

export class DeleteTransaction {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute({ id, userId }: DeleteTransactionInput): Promise<void> {
    const current = await this.transactions.findById(id, userId)
    if (!current) throw new ApplicationError('TRANSACTION_NOT_FOUND', `Transaction not found: ${id}`)
    await this.transactions.delete(id, userId)
  }
}
