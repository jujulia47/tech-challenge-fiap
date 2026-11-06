import { TRANSACTION_TYPES, type TransactionStatistics, type TransactionSummary, type TransactionType } from '@bytebank/core'
import { databaseError, type SupabaseDatabase } from './database'

const TABLE = 'transactions'

// Counts only: no row leaves the database. A HEAD request has no body, so a failure can come
// with no error object, and the status is checked too.
export class SupabaseTransactionStatistics implements TransactionStatistics {
  constructor(private readonly database: SupabaseDatabase) {}

  async summary(): Promise<TransactionSummary> {
    const [total, ...perType] = await Promise.all([this.count(), ...TRANSACTION_TYPES.map(type => this.count(type))])
    return { total, types: TRANSACTION_TYPES.filter((_, index) => perType[index] > 0) }
  }

  private async count(type?: TransactionType): Promise<number> {
    const query = this.database.from(TABLE).select('id', { count: 'exact', head: true })
    const { count, error, status } = await (type ? query.eq('type', type) : query)
    if (error || status >= 400) throw databaseError('count transactions', error ?? {}, status)
    return count ?? 0
  }
}
