import { describe, expect, it } from 'vitest'
import { minutesLeft, msUntilNextMinute, rateLimitCode, retryAfterMsFrom, retryMessage } from './loginRetry'

const MINUTE = 60_000

describe('rateLimitCode and retryAfterMsFrom', () => {
  it('carries the wait to the browser, rounded up to the second', () => {
    expect(retryAfterMsFrom(rateLimitCode(89_001))).toBe(90_000)
  })

  it.each([
    ['no code', undefined],
    ['the code of a common failure', 'credentials'],
    ['a code without a number', 'rate_limited_abc'],
    ['a code with nothing left', 'rate_limited_0'],
  ])('answers null for %s', (_, code) => {
    expect(retryAfterMsFrom(code)).toBeNull()
  })
})

describe('minutesLeft', () => {
  it.each([
    [15 * MINUTE, 15],
    [14 * MINUTE + 1, 15],
    [14 * MINUTE, 14],
    [1, 1],
    [0, 0],
  ])('%d ms left is %d minutes', (remaining, minutes) => {
    expect(minutesLeft(remaining)).toBe(minutes)
  })
})

describe('msUntilNextMinute', () => {
  it('waits for the rest of the current minute', () => {
    expect(msUntilNextMinute(7 * MINUTE + 30_000)).toBe(30_000)
  })

  it('waits a whole minute on an exact minute', () => {
    expect(msUntilNextMinute(7 * MINUTE)).toBe(MINUTE)
  })

  it('reaches every change until the end, and the end exactly', () => {
    const shown: number[] = []
    let remaining = 2 * MINUTE + 30_000

    while (remaining > 0) {
      shown.push(minutesLeft(remaining))
      remaining -= msUntilNextMinute(remaining)
    }

    expect(shown).toEqual([3, 2, 1])
    expect(remaining).toBe(0)
  })
})

describe('retryMessage', () => {
  it('uses the plural', () => {
    expect(retryMessage(15)).toBe('Muitas tentativas. Tente novamente em 15 minutos')
  })

  it('uses the singular for one minute', () => {
    expect(retryMessage(1)).toBe('Muitas tentativas. Tente novamente em 1 minuto')
  })
})
