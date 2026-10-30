import type { TransactionRepository } from '../application/ports/TransactionRepository'
import type { Transaction } from '../domain/transaction/Transaction'

export class InMemoryTransactionRepository implements TransactionRepository {
  private readonly items = new Map<string, Transaction>()

  constructor(initial: readonly Transaction[] = []) {
    for (const transaction of initial) this.items.set(transaction.id, transaction)
  }

  async findAllByUser(userId: string): Promise<Transaction[]> {
    return [...this.items.values()].filter(transaction => transaction.userId === userId)
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const transaction = this.items.get(id)
    return transaction?.userId === userId ? transaction : null
  }

  async create(transaction: Transaction): Promise<Transaction> {
    this.items.set(transaction.id, transaction)
    return transaction
  }

  async update(transaction: Transaction): Promise<void> {
    this.items.set(transaction.id, transaction)
  }

  async delete(id: string, userId: string): Promise<void> {
    if (await this.findById(id, userId)) this.items.delete(id)
  }
}
