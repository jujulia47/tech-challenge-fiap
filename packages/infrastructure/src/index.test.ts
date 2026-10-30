import { describe, expect, it } from 'vitest'
import * as infrastructure from './index'

describe('@bytebank/infrastructure public API', () => {
  it('exports the adapters and the migration', () => {
    expect(Object.keys(infrastructure).sort()).toEqual([
      'CryptoIdGenerator',
      'HttpTransactionRepository',
      'InfrastructureError',
      'SaoPauloClock',
      'migrateTransactions',
      'parseTransactionRecord',
      'recordFromPrimitives',
      'transactionFromRecord',
    ])
  })
})
