import type { CalendarDate } from '../../domain/value-objects/CalendarDate'

export interface Clock {
  today(): CalendarDate
}
