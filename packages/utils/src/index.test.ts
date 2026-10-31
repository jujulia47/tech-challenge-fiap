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
      'formatCents',
      'formatDateBR',
      'formatMonthKey',
      'formatSignedCents',
      'getFirstName',
      'groupDtosByMonth',
      'minutesLeft',
      'msUntilNextMinute',
      'rateLimitCode',
      'readSessionPolicy',
      'retryAfterMsFrom',
      'retryMessage',
      'securityHeaders',
      'withContentSecurityPolicy',
    ])
  })
})
