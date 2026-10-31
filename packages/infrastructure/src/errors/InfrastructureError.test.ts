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

  it('carries the code and the cause', () => {
    const cause = new TypeError('fetch failed')

    const error = new InfrastructureError('failed', { code: 'UPSTREAM_UNREACHABLE', cause })

    expect(error.code).toBe('UPSTREAM_UNREACHABLE')
    expect(error.cause).toBe(cause)
  })

  it('has no details by default', () => {
    const error = new InfrastructureError('failed')

    expect(error.code).toBeUndefined()
    expect(error.status).toBeUndefined()
    expect(error.url).toBeUndefined()
    expect(error.cause).toBeUndefined()
  })
})
