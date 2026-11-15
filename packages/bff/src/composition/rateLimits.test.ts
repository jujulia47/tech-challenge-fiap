import { describe, expect, it } from 'vitest'
import { LOGIN_BY_EMAIL, LOGIN_BY_IP, RESET_REQUEST_BY_EMAIL, readLoginLimits } from './rateLimits'

const DEFAULTS = { byEmail: LOGIN_BY_EMAIL, byIp: LOGIN_BY_IP }

describe('readLoginLimits', () => {
  it('keeps the 15 minutes with no variable', () => {
    expect(readLoginLimits({})).toEqual(DEFAULTS)
    expect(LOGIN_BY_EMAIL).toEqual({ maxHits: 5, windowMs: 15 * 60_000 })
  })

  it('shortens the window of both login limits, and keeps the number of attempts', () => {
    expect(readLoginLimits({ RATE_LIMIT_WINDOW_SECONDS: '30' })).toEqual({
      byEmail: { maxHits: 5, windowMs: 30_000 },
      byIp: { maxHits: 20, windowMs: 30_000 },
    })
  })

  it.each([
    ['a value above the default', '901'],
    ['the default itself', '900'],
    ['an empty value', ''],
    ['zero', '0'],
    ['a negative value', '-30'],
    ['a fraction', '30.5'],
    ['text', 'trinta'],
  ])('ignores %s', (_, value) => {
    expect(readLoginLimits({ RATE_LIMIT_WINDOW_SECONDS: value })).toEqual(DEFAULTS)
  })

  it('leaves the reset requests alone', () => {
    readLoginLimits({ RATE_LIMIT_WINDOW_SECONDS: '30' })
    expect(RESET_REQUEST_BY_EMAIL.windowMs).toBe(15 * 60_000)
  })
})
