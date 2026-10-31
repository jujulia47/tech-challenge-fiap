import { MAX_ATTACHMENT_BYTES } from '@bytebank/bff/limits'
import { describe, expect, it } from 'vitest'
import * as bff from './index'

describe('@bytebank/bff public API', () => {
  it('exports the composition functions and the handlers', () => {
    expect(Object.keys(bff).sort()).toEqual([
      'createJsonServerUseCases',
      'createTransactionHandlers',
      'createUseCases',
    ])
  })
})

describe('@bytebank/bff/limits', () => {
  it('exposes the attachment limit through the subpath', () => {
    expect(MAX_ATTACHMENT_BYTES).toBe(70 * 1024)
  })

  it('is the only place that exports it: the main entry stays server code', () => {
    expect(bff).not.toHaveProperty('MAX_ATTACHMENT_BYTES')
  })
})
