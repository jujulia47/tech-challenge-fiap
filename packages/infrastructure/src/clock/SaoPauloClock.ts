import { CalendarDate, type Clock } from '@bytebank/core'

const FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

// "Today" is always the calendar day in São Paulo, never the server's timezone
export class SaoPauloClock implements Clock {
  constructor(private readonly now: () => Date = () => new Date()) {}

  today(): CalendarDate {
    const parts = Object.fromEntries(FORMATTER.formatToParts(this.now()).map(part => [part.type, part.value]))
    return CalendarDate.fromParts(Number(parts.year), Number(parts.month), Number(parts.day))
  }
}
