import { describe, expect, it } from 'vitest'
import { TRANSACTION_TYPES, isTransactionType, transactionDirection } from './TransactionType'

describe('TRANSACTION_TYPES', () => {
  it('lists the seven type codes', () => {
    expect(TRANSACTION_TYPES).toEqual([
      'deposit',
      'withdrawal',
      'transfer',
      'payment',
      'currency_exchange',
      'doc_ted',
      'loan',
    ])
  })
})

describe('isTransactionType', () => {
  it.each(TRANSACTION_TYPES)('accepts %s', type => {
    expect(isTransactionType(type)).toBe(true)
  })

  it.each(['', 'Depósito', 'DEPOSIT', 'constructor', 'unknown'])('rejects %j', value => {
    expect(isTransactionType(value)).toBe(false)
  })
})

describe('transactionDirection', () => {
  it.each(['deposit', 'loan'] as const)('%s is income', type => {
    expect(transactionDirection(type)).toBe('income')
  })

  it.each(['withdrawal', 'payment', 'transfer', 'doc_ted', 'currency_exchange'] as const)('%s is expense', type => {
    expect(transactionDirection(type)).toBe('expense')
  })
})
