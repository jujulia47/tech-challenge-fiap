import { describe, expect, it } from 'vitest'
import { InfrastructureError } from './InfrastructureError'

describe('InfrastructureError', () => {
  it('carries the status and the url', () => {
    const error = new InfrastructureError('failed', { status: 500, url: 'http://api/transactions' })

    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('InfrastructureError')
    expect(error.message).toBe('failed')
    expect(error.status).toBe(500)
    expect(error.url).toBe('http://api/transactions')
  })

  it('has no details by default', () => {
    const error = new InfrastructureError('failed')

    expect(error.status).toBeUndefined()
    expect(error.url).toBeUndefined()
  })
})
