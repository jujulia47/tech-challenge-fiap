import { afterEach, describe, expect, it, vi } from 'vitest'
import { SaoPauloClock } from './SaoPauloClock'

const clockAt = (instant: string) => new SaoPauloClock(() => new Date(instant))

describe('SaoPauloClock', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it.each([
    // 22:30 in São Paulo: already the next day in UTC
    ['2026-10-30T01:30:00Z', '2026-10-29'],
    ['2026-10-30T02:59:59Z', '2026-10-29'],
    // Midnight in São Paulo
    ['2026-10-30T03:00:00Z', '2026-10-30'],
    // Turn of the month and of the year
    ['2026-11-01T02:00:00Z', '2026-10-31'],
    ['2027-01-01T02:59:00Z', '2026-12-31'],
    ['2027-01-01T03:00:00Z', '2027-01-01'],
    // Leap day
    ['2028-03-01T01:00:00Z', '2028-02-29'],
  ])('%s is %s in São Paulo', (instant, expected) => {
    expect(clockAt(instant).today().toISO()).toBe(expected)
  })

  it('reads the current time by default', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-30T01:30:00Z'))

    expect(new SaoPauloClock().today().toISO()).toBe('2026-10-29')
  })
})
