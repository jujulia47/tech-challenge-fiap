import { afterEach, describe, expect, it, vi } from 'vitest'
import { CalendarDate } from './CalendarDate'

const invalidFormat = expect.objectContaining({ code: 'CALENDAR_DATE_INVALID_FORMAT' })
const invalidValue = expect.objectContaining({ code: 'CALENDAR_DATE_INVALID_VALUE' })

describe('CalendarDate', () => {
  describe('fromISO', () => {
    it('parses year, month and day', () => {
      const date = CalendarDate.fromISO('2022-11-18')

      expect(date.year).toBe(2022)
      expect(date.month).toBe(11)
      expect(date.day).toBe(18)
    })

    it.each(['', '18/11/2022', '2022-11', '2022-1-1', '22-11-18', '2022-11-18T00:00:00', ' 2022-11-18', 'abcd-ef-gh'])(
      'rejects the format %j',
      value => {
        expect(() => CalendarDate.fromISO(value)).toThrow(invalidFormat)
      },
    )

    it.each(['2023-02-29', '2022-13-01', '2022-00-10', '2022-04-31', '2022-11-00', '2022-11-32', '0000-01-01'])(
      'rejects the nonexistent date %s',
      value => {
        expect(() => CalendarDate.fromISO(value)).toThrow(invalidValue)
      },
    )

    describe('timezone safety', () => {
      afterEach(() => {
        vi.unstubAllEnvs()
      })

      it.each(['America/Sao_Paulo', 'Pacific/Kiritimati', 'UTC'])('stays on day 18 in %s', timeZone => {
        vi.stubEnv('TZ', timeZone)
        const date = CalendarDate.fromISO('2022-11-18')

        expect(date.day).toBe(18)
        expect(date.toISO()).toBe('2022-11-18')
      })
    })
  })

  describe('fromParts', () => {
    it('builds a date', () => {
      expect(CalendarDate.fromParts(2026, 3, 8).toISO()).toBe('2026-03-08')
    })

    it.each([
      [2022, 13, 1],
      [2022, 0, 1],
      [2022, 1, 0],
      [0, 1, 1],
      [10000, 1, 1],
      [2022.5, 1, 1],
      [2022, 1.5, 1],
      [2022, 1, 1.5],
      [Number.NaN, 1, 1],
    ])('rejects %d-%d-%d', (year, month, day) => {
      expect(() => CalendarDate.fromParts(year, month, day)).toThrow(invalidValue)
    })
  })

  describe('leap years and month ends', () => {
    it.each(['2024-02-29', '2000-02-29', '2400-02-29'])('accepts the leap day %s', value => {
      expect(CalendarDate.fromISO(value).toISO()).toBe(value)
    })

    it.each(['2023-02-29', '1900-02-29', '2100-02-29'])('rejects the non-leap day %s', value => {
      expect(() => CalendarDate.fromISO(value)).toThrow(invalidValue)
    })

    it.each([
      ['01', 31],
      ['02', 28],
      ['03', 31],
      ['04', 30],
      ['05', 31],
      ['06', 30],
      ['07', 31],
      ['08', 31],
      ['09', 30],
      ['10', 31],
      ['11', 30],
      ['12', 31],
    ])('month %s of 2023 ends on day %d', (month, lastDay) => {
      expect(CalendarDate.fromISO(`2023-${month}-${lastDay}`).day).toBe(lastDay)
      expect(() => CalendarDate.fromISO(`2023-${month}-${lastDay + 1}`)).toThrow(invalidValue)
    })
  })

  describe('subtractMonths', () => {
    it.each([
      ['2026-05-15', 3, '2026-02-15'],
      ['2026-05-15', 0, '2026-05-15'],
      ['2026-01-15', 1, '2025-12-15'],
      ['2026-02-10', 6, '2025-08-10'],
      ['2026-03-10', 15, '2024-12-10'],
    ])('%s minus %d months is %s', (date, months, expected) => {
      expect(CalendarDate.fromISO(date).subtractMonths(months).toISO()).toBe(expected)
    })

    it.each([
      ['2026-05-31', 3, '2026-02-28'],
      ['2024-05-31', 3, '2024-02-29'],
      ['2026-07-31', 3, '2026-04-30'],
      ['2026-03-30', 1, '2026-02-28'],
    ])('clamps %s minus %d months to the end of the month: %s', (date, months, expected) => {
      expect(CalendarDate.fromISO(date).subtractMonths(months).toISO()).toBe(expected)
    })

    it('rejects a result before year 1', () => {
      expect(() => CalendarDate.fromISO('0001-01-15').subtractMonths(1)).toThrow(invalidValue)
    })

    it('rejects a fractional number of months', () => {
      expect(() => CalendarDate.fromISO('2026-05-15').subtractMonths(1.5)).toThrow(invalidValue)
    })
  })

  it('formats with zero padding', () => {
    const date = CalendarDate.fromParts(987, 3, 5)

    expect(date.toISO()).toBe('0987-03-05')
    expect(date.monthKey()).toBe('0987-03')
  })

  it('monthKey returns year and month', () => {
    expect(CalendarDate.fromISO('2022-11-18').monthKey()).toBe('2022-11')
  })

  it('is frozen at runtime', () => {
    expect(Object.isFrozen(CalendarDate.fromISO('2022-11-18'))).toBe(true)
  })

  describe('comparison', () => {
    const earlier = CalendarDate.fromISO('2022-11-18')
    const later = CalendarDate.fromISO('2022-11-19')

    it('isAfter', () => {
      expect(later.isAfter(earlier)).toBe(true)
      expect(earlier.isAfter(later)).toBe(false)
      expect(earlier.isAfter(earlier)).toBe(false)
    })

    it('isBefore', () => {
      expect(earlier.isBefore(later)).toBe(true)
      expect(later.isBefore(earlier)).toBe(false)
      expect(earlier.isBefore(earlier)).toBe(false)
    })

    it('equals compares by value', () => {
      expect(earlier.equals(CalendarDate.fromISO('2022-11-18'))).toBe(true)
      expect(earlier.equals(later)).toBe(false)
    })

    it('compare returns -1, 0 or 1', () => {
      expect(earlier.compare(later)).toBe(-1)
      expect(earlier.compare(earlier)).toBe(0)
      expect(later.compare(earlier)).toBe(1)
    })

    it('orders across months and years', () => {
      expect(CalendarDate.fromISO('2022-12-01').isAfter(CalendarDate.fromISO('2022-11-30'))).toBe(true)
      expect(CalendarDate.fromISO('2023-01-01').isAfter(CalendarDate.fromISO('2022-12-31'))).toBe(true)
    })
  })
})
