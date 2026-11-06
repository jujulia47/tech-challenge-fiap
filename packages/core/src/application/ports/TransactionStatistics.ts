import type { TransactionType } from '../../domain/transaction/TransactionType'

// Numbers of the whole bank, for a public page: no user, no amount, no transaction
export interface TransactionSummary {
  total: number
  types: TransactionType[]
}

export interface TransactionStatistics {
  summary(): Promise<TransactionSummary>
}
