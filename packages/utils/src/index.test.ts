import { describe, expect, it } from 'vitest'
import * as utils from './index'

describe('@bytebank/utils public API', () => {
  it('re-exports every module', () => {
    expect(Object.keys(utils).sort()).toEqual([
      'TRANSACTION_OPTIONS',
      'capitalizeMonth',
      'cn',
      'formatCents',
      'getFirstName',
      'groupByMonth',
    ])
  })
})
