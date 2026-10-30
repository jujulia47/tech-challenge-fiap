import { describe, expect, it } from 'vitest'
import * as core from './index'

describe('@bytebank/core public API', () => {
  it('exports the domain and application layers', () => {
    expect(Object.keys(core).sort()).toEqual([
      'ApplicationError',
      'CalendarDate',
      'CreateTransaction',
      'DeleteTransaction',
      'DomainError',
      'GetBalance',
      'GetChartData',
      'GetStatement',
      'ListTransactions',
      'Money',
      'TRANSACTION_TYPES',
      'Transaction',
      'UpdateTransaction',
      'filterByPeriod',
      'groupByMonth',
      'isTransactionType',
      'sortNewestFirst',
      'totalsByMonth',
      'totalsByType',
      'transactionDirection',
    ])
  })

  it('does not export the testing helpers', () => {
    expect(core).not.toHaveProperty('InMemoryTransactionRepository')
  })
})
