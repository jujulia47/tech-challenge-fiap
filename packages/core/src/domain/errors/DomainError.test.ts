import { describe, expect, it } from 'vitest'
import { DomainError } from './DomainError'

describe('DomainError', () => {
  it('is an Error that carries a code and a message', () => {
    const error = new DomainError('MONEY_INVALID_CENTS', 'bad amount')

    expect(error).toBeInstanceOf(Error)
    expect(error).toBeInstanceOf(DomainError)
    expect(error.name).toBe('DomainError')
    expect(error.code).toBe('MONEY_INVALID_CENTS')
    expect(error.message).toBe('bad amount')
  })
})
