import { describe, expect, it } from 'vitest'
import * as utils from './index'

describe('@bytebank/utils public API', () => {
  it('re-exports every module', () => {
    expect(Object.keys(utils).sort()).toEqual([
      'BrowserClock',
      'SECRET_BYTES',
      'SESSION_POLICY',
      'TRANSACTION_TYPE_LABELS',
      'TRANSACTION_TYPE_OPTIONS',
      'assertSecrets',
      'authLogger',
      'cn',
      'contentSecurityPolicy',
      'exitUnlessSecrets',
      'filterTransactions',
      'formatCents',
      'formatDateBR',
      'formatMonthKey',
      'formatMonthShort',
      'formatSignedCents',
      'getFirstName',
      'groupDtosByMonth',
      'isUsableSecret',
      'minutesLeft',
      'msUntilNextMinute',
      'onIntent',
      'passwordErrorMessage',
      'preloadable',
      'rateLimitCode',
      'readSessionPolicy',
      'retryAfterMsFrom',
      'retryMessage',
      'secretMessage',
      'securityHeaders',
      'toggleTypeFilter',
      'typeFilterMessage',
      'withContentSecurityPolicy',
      'zoneRewrites',
    ])
  })
})
