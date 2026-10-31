import * as testing from '@bytebank/core/testing'
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

  it.each(['InMemoryTransactionRepository', 'FixedClock', 'SequentialIdGenerator', 'aTransaction'])(
    'does not export the testing helper %s',
    helper => {
      expect(core).not.toHaveProperty(helper)
    },
  )
})

describe('@bytebank/core/testing', () => {
  it('exports the testing helpers through the subpath', () => {
    expect(Object.keys(testing).sort()).toEqual([
      'FixedClock',
      'InMemoryTransactionRepository',
      'SequentialIdGenerator',
      'aTransaction',
    ])
  })
})
