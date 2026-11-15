import { describe, expect, it } from 'vitest'
import { msUntilNextChange, rateLimitCode, retryAfterMsFrom, retryMessage, retryWait } from './loginRetry'

const MINUTE = 60_000
const SECOND = 1_000

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

describe('retryWait', () => {
  it.each([
    [15 * MINUTE, 15, 'minute'],
    [14 * MINUTE + 1, 15, 'minute'],
    [2 * MINUTE, 2, 'minute'],
    [MINUTE + 1, 2, 'minute'],
    [MINUTE, 1, 'minute'],
    [59 * SECOND + 1, 1, 'minute'],
    [59 * SECOND, 59, 'second'],
    [25 * SECOND, 25, 'second'],
    [1, 1, 'second'],
    [0, 0, 'second'],
  ])('%d ms left shows %d %s(s), never less than what is left', (remaining, value, unit) => {
    expect(retryWait(remaining)).toEqual({ value, unit })
  })
})

describe('msUntilNextChange', () => {
  it('waits for the next minute while it shows minutes', () => {
    expect(msUntilNextChange(7 * MINUTE + 30 * SECOND)).toBe(30 * SECOND)
  })

  it('leaves "1 minuto" when 59 seconds are left, then ticks every second', () => {
    expect(msUntilNextChange(MINUTE)).toBe(SECOND)
    expect(msUntilNextChange(30 * SECOND + 400)).toBe(400)
    expect(msUntilNextChange(30 * SECOND)).toBe(SECOND)
  })

  it('shows every value from 2 minutes down to 1 second, and reaches the end exactly', () => {
    const shown: string[] = []
    let remaining = 2 * MINUTE + 30 * SECOND
    while (remaining > 0) {
      const { value, unit } = retryWait(remaining)
      const label = `${value}${unit === 'minute' ? 'min' : 's'}`
      if (shown.at(-1) !== label) shown.push(label)
      remaining -= msUntilNextChange(remaining)
    }
    expect(shown).toEqual(['3min', '2min', '1min', ...Array.from({ length: 59 }, (_, i) => `${59 - i}s`)])
    expect(remaining).toBe(0)
  })
})

describe('retryMessage', () => {
  it('counts in minutes from one minute on', () => {
    expect(retryMessage(15 * MINUTE)).toBe('Muitas tentativas. Tente novamente em 15 minutos')
    expect(retryMessage(MINUTE)).toBe('Muitas tentativas. Tente novamente em 1 minuto')
  })

  it('counts in seconds below one minute', () => {
    expect(retryMessage(25 * SECOND)).toBe('Muitas tentativas. Tente novamente em 25 segundos')
    expect(retryMessage(SECOND)).toBe('Muitas tentativas. Tente novamente em 1 segundo')
  })
})
