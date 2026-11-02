import { bankDayOf, type CalendarDate, type Clock } from '@bytebank/core'

// "Today" is always the calendar day in São Paulo, never the server's timezone
export class SaoPauloClock implements Clock {
  constructor(private readonly now: () => Date = () => new Date()) {}

  today(): CalendarDate {
    return bankDayOf(this.now())
  }
}
