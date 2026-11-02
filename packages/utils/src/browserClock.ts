import { bankDayOf, type CalendarDate, type Clock } from '@bytebank/core'

// The Clock of the screens. Same rule as the SaoPauloClock of the server, which the browser
// cannot import: both ask the core for the day in São Paulo.
export class BrowserClock implements Clock {
  constructor(private readonly now: () => Date = () => new Date()) {}

  today(): CalendarDate {
    return bankDayOf(this.now())
  }
}
