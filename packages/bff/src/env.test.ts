import { parseAllowedOrigins as fromSubpath, requireEnv as requireFromSubpath } from '@bytebank/bff/env'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as bff from './index'
import { parseAllowedOrigins, requireEnv } from './env'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('@bytebank/bff/env', () => {
  it('is exposed through the subpath', () => {
    expect(fromSubpath).toBe(parseAllowedOrigins)
    expect(requireFromSubpath).toBe(requireEnv)
  })

  it('stays out of the main entry', () => {
    expect(bff).not.toHaveProperty('requireEnv')
  })
})

describe('requireEnv', () => {
  it('returns the value', () => {
    vi.stubEnv('BFF_TEST_VARIABLE', 'http://localhost:3001')

    expect(requireEnv('BFF_TEST_VARIABLE')).toBe('http://localhost:3001')
  })

  it('reads the value on every call', () => {
    vi.stubEnv('BFF_TEST_VARIABLE', 'first')
    requireEnv('BFF_TEST_VARIABLE')
    vi.stubEnv('BFF_TEST_VARIABLE', 'second')

    expect(requireEnv('BFF_TEST_VARIABLE')).toBe('second')
  })

  it('fails with the name of a variable that is missing', () => {
    expect(() => requireEnv('BFF_TEST_MISSING')).toThrow('Missing required environment variable: BFF_TEST_MISSING')
  })

  it('treats an empty value as missing', () => {
    vi.stubEnv('BFF_TEST_VARIABLE', '')

    expect(() => requireEnv('BFF_TEST_VARIABLE')).toThrow('Missing required environment variable: BFF_TEST_VARIABLE')
  })
})

describe('parseAllowedOrigins', () => {
  it('reads one origin', () => {
    expect(parseAllowedOrigins('http://localhost:3000')).toEqual(['http://localhost:3000'])
  })

  it('reads a list, ignoring spaces and empty entries', () => {
    expect(parseAllowedOrigins(' http://localhost:3000 , https://bytebank.example,, ')).toEqual([
      'http://localhost:3000',
      'https://bytebank.example',
    ])
  })

  it.each([[''], [' '], [','], [' , ']])('fails for %j, which has no origins', value => {
    expect(() => parseAllowedOrigins(value)).toThrow('ALLOWED_ORIGINS has no origins')
  })

  it.each([
    ['a trailing slash', 'http://localhost:3000/'],
    ['a path', 'http://localhost:3000/dashboard'],
    ['no scheme', 'localhost:3000'],
    ['uppercase', 'HTTP://LOCALHOST:3000'],
    ['a default port', 'http://localhost:80'],
    ['a wildcard', '*'],
    ['a value with no origin', 'about:blank'],
  ])('fails for %s, which would never match an Origin header', (_, value) => {
    expect(() => parseAllowedOrigins(value)).toThrow(`ALLOWED_ORIGINS has an invalid origin: "${value}"`)
  })

  it('names the invalid entry of a list', () => {
    expect(() => parseAllowedOrigins('http://localhost:3000,https://bytebank.example/')).toThrow(
      'ALLOWED_ORIGINS has an invalid origin: "https://bytebank.example/"',
    )
  })
})
