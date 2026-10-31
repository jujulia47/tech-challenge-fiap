import * as testing from '@bytebank/core/testing'
import { describe, expect, it } from 'vitest'
import * as core from './index'

describe('@bytebank/core public API', () => {
  it('exports the domain and application layers', () => {
    expect(Object.keys(core).sort()).toEqual([
      'ApplicationError',
      'AuthenticateUser',
      'CalendarDate',
      'CreateTransaction',
      'DeleteTransaction',
      'DomainError',
      'GetBalance',
      'GetChartData',
      'GetStatement',
      'ListTransactions',
      'Money',
      'PASSWORD_MAX_LENGTH',
      'PASSWORD_MIN_LENGTH',
      'RateLimitedError',
      'RegisterUser',
      'RequestPasswordReset',
      'ResetPassword',
      'TRANSACTION_TYPES',
      'Transaction',
      'UpdateTransaction',
      'User',
      'filterByPeriod',
      'findPasswordIssue',
      'groupByMonth',
      'isTransactionType',
      'normalizeEmail',
      'passwordLength',
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
      'FakeCommonPasswordList',
      'FakeEmailSender',
      'FakePasswordHasher',
      'FakeRateLimiter',
      'FakeResetTokenGenerator',
      'FixedClock',
      'InMemoryPasswordResetTokenRepository',
      'InMemoryTransactionRepository',
      'InMemoryUserRepository',
      'SequentialIdGenerator',
      'aTransaction',
    ])
  })
})
