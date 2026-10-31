import { describe, expect, it } from 'vitest'
import { clientIp } from './clientIp'

const headers = (value: string) => new Headers({ 'x-forwarded-for': value })

describe('clientIp', () => {
  it('reads a single address', () => {
    expect(clientIp(headers('10.0.0.1'))).toBe('10.0.0.1')
  })

  it('takes the entry of the closest proxy, not the one the client sent', () => {
    expect(clientIp(headers('1.1.1.1, 10.0.0.1 '))).toBe('10.0.0.1')
  })

  it('answers undefined without the header', () => {
    expect(clientIp(new Headers())).toBeUndefined()
  })

  it('answers undefined for an empty header', () => {
    expect(clientIp(headers(' '))).toBeUndefined()
  })
})
