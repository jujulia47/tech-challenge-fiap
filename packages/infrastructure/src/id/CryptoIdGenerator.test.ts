import { describe, expect, it } from 'vitest'
import { CryptoIdGenerator } from './CryptoIdGenerator'

describe('CryptoIdGenerator', () => {
  it('generates UUIDs', () => {
    expect(new CryptoIdGenerator().next()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  })

  it('does not repeat ids', () => {
    const ids = new CryptoIdGenerator()

    expect(ids.next()).not.toBe(ids.next())
  })
})
