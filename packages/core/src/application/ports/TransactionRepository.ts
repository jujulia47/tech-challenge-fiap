import type { Transaction } from '../../domain/transaction/Transaction'

// Every operation is scoped to a user. findById returns null both when the
// transaction does not exist and when it belongs to another user.
export interface TransactionRepository {
  findAllByUser(userId: string): Promise<Transaction[]>
  findById(id: string, userId: string): Promise<Transaction | null>
  // Returns what was stored: a backend may assign its own id (json-server does)
  create(transaction: Transaction): Promise<Transaction>
  update(transaction: Transaction): Promise<void>
  delete(id: string, userId: string): Promise<void>
}
