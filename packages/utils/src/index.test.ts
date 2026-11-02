import { describe, expect, it } from 'vitest'
import * as utils from './index'

describe('@bytebank/utils public API', () => {
  it('re-exports every module', () => {
    expect(Object.keys(utils).sort()).toEqual([
      'SESSION_POLICY',
      'TRANSACTION_TYPE_LABELS',
      'TRANSACTION_TYPE_OPTIONS',
      'authLogger',
      'cn',
      'contentSecurityPolicy',
      'filterTransactions',
      'formatCents',
      'formatDateBR',
      'formatMonthKey',
      'formatMonthShort',
      'formatSignedCents',
      'getFirstName',
      'groupDtosByMonth',
      'minutesLeft',
      'msUntilNextMinute',
      'onIntent',
      'preloadable',
      'rateLimitCode',
      'readSessionPolicy',
      'retryAfterMsFrom',
      'retryMessage',
      'securityHeaders',
      'toggleTypeFilter',
      'typeFilterMessage',
      'withContentSecurityPolicy',
    ])
  })
})
