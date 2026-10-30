import type { CalendarDate } from '../../domain/value-objects/CalendarDate'
import { ApplicationError } from '../errors/ApplicationError'
import type { Clock } from '../ports/Clock'

export function assertDateNotInFuture(date: CalendarDate, clock: Clock): void {
  if (date.isAfter(clock.today())) {
    throw new ApplicationError('TRANSACTION_DATE_IN_FUTURE', `Transaction date is in the future: ${date.toISO()}`)
  }
}
