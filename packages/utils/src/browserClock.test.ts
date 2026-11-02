import { ApplicationError, CalendarDate, assertDateNotInFuture } from '@bytebank/core'
import { describe, expect, it } from 'vitest'
import { BrowserClock } from './browserClock'

// 22:30 of October 29 in São Paulo, already October 30 in UTC
const LATE_EVENING = new Date('2026-10-30T01:30:00Z')
const clock = new BrowserClock(() => LATE_EVENING)

describe('BrowserClock', () => {
  it('gives the day in São Paulo, not in UTC nor in the timezone of the browser', () => {
    expect(clock.today().toISO()).toBe('2026-10-29')
  })

  it('turns the day at midnight in São Paulo', () => {
    expect(new BrowserClock(() => new Date('2026-10-30T03:00:00Z')).today().toISO()).toBe('2026-10-30')
  })
})

describe('assertDateNotInFuture with the clock of the browser', () => {
  it('accepts today in São Paulo', () => {
    expect(() => assertDateNotInFuture(CalendarDate.fromISO('2026-10-29'), clock)).not.toThrow()
  })

  it('refuses the next day, even when it is already that day in UTC', () => {
    const error = (() => {
      try {
        assertDateNotInFuture(CalendarDate.fromISO('2026-10-30'), clock)
        return null
      } catch (caught) {
        return caught
      }
    })()

    expect(error).toBeInstanceOf(ApplicationError)
    expect(error).toMatchObject({ code: 'TRANSACTION_DATE_IN_FUTURE' })
  })
})
