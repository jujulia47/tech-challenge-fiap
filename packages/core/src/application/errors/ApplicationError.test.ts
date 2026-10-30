import { describe, expect, it } from 'vitest'
import { DomainError } from '../../domain/errors/DomainError'
import { ApplicationError } from './ApplicationError'

describe('ApplicationError', () => {
  it('is an Error that carries a code and a message', () => {
    const error = new ApplicationError('TRANSACTION_NOT_FOUND', 'not found')

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ApplicationError')
    expect(error.code).toBe('TRANSACTION_NOT_FOUND')
    expect(error.message).toBe('not found')
  })

  it('is distinct from DomainError', () => {
    expect(new ApplicationError('TRANSACTION_DATE_IN_FUTURE', 'x')).not.toBeInstanceOf(DomainError)
  })
})
