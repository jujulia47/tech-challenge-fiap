import { ApplicationError, type Transaction, type TransactionRepository } from '@bytebank/core'
import { transactionFromRecord } from '../json-server/transactionRecordMapper'
import { databaseError, invalidResponse, type SupabaseDatabase } from './database'

const TABLE = 'transactions'
const COLUMNS = 'id, user_id, type, amount_in_cents, date, attachment'

interface TransactionRow {
  id: string
  user_id: string
  type: string
  amount_in_cents: number
  date: string
  attachment: string | null
}

function rowFrom(transaction: Transaction): TransactionRow {
  const { id, userId, type, amountInCents, date, attachment } = transaction.toPrimitives()
  // null removes a stored attachment: an absent one in the domain is no attachment
  return { id, user_id: userId, type, amount_in_cents: amountInCents, date, attachment: attachment ?? null }
}

// Through the record of the json-server adapter, so both backends validate stored data alike
function transactionFrom(value: unknown): Transaction {
  const row = value as Partial<TransactionRow> | null
  return transactionFromRecord({
    id: row?.id,
    userId: row?.user_id,
    type: row?.type,
    amountInCents: row?.amount_in_cents,
    date: row?.date,
    ...(row?.attachment == null ? {} : { attachment: row.attachment }),
  })
}

const notFound = (id: string) => new ApplicationError('TRANSACTION_NOT_FOUND', `Transaction not found: ${id}`)

export class SupabaseTransactionRepository implements TransactionRepository {
  constructor(private readonly database: SupabaseDatabase) {}

  async findAllByUser(userId: string): Promise<Transaction[]> {
    const { data, error, status } = await this.database.from(TABLE).select(COLUMNS).eq('user_id', userId)
    if (error) throw databaseError('list transactions', error, status)
    if (!Array.isArray(data)) throw invalidResponse('list transactions')
    // Ownership is checked here too: isolation must not depend on the filter of the server
    return data.map(transactionFrom).filter(transaction => transaction.userId === userId)
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const { data, error, status } = await this.database
      .from(TABLE)
      .select(COLUMNS)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle()
    if (error) throw databaseError('find transaction', error, status)
    return data === null ? null : transactionFrom(data)
  }

  async create(transaction: Transaction): Promise<Transaction> {
    const { data, error, status } = await this.database.from(TABLE).insert(rowFrom(transaction)).select(COLUMNS).single()
    if (error) throw databaseError('create transaction', error, status)
    return transactionFrom(data)
  }

  // Scoped to the owner in the same statement: no row changes, and the answer is not found
  async update(transaction: Transaction): Promise<void> {
    const { id, user_id, ...changes } = rowFrom(transaction)
    const { data, error, status } = await this.database
      .from(TABLE)
      .update(changes)
      .eq('id', id)
      .eq('user_id', user_id)
      .select('id')
    if (error) throw databaseError('update transaction', error, status)
    if (!Array.isArray(data) || data.length === 0) throw notFound(id)
  }

  async delete(id: string, userId: string): Promise<void> {
    const { data, error, status } = await this.database
      .from(TABLE)
      .delete()
      .eq('id', id)
      .eq('user_id', userId)
      .select('id')
    if (error) throw databaseError('delete transaction', error, status)
    if (!Array.isArray(data) || data.length === 0) throw notFound(id)
  }
}
