import { CalendarDate } from './CalendarDate'

// The bank works on the calendar of São Paulo: "today" never depends on the timezone
// of the server or of the browser
export const BANK_TIME_ZONE = 'America/Sao_Paulo'

const FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: BANK_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function bankDayOf(instant: Date): CalendarDate {
  const parts = Object.fromEntries(FORMATTER.formatToParts(instant).map(part => [part.type, part.value]))
  return CalendarDate.fromParts(Number(parts.year), Number(parts.month), Number(parts.day))
}
