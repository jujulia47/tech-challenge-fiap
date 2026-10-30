import { DomainError } from '../errors/DomainError'

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/
const MIN_YEAR = 1
const MAX_YEAR = 9999

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return [4, 6, 9, 11].includes(month) ? 30 : 31
}

// A calendar day with no time and no timezone. Deliberately never touches Date:
// parsing an ISO string with Date reads it as UTC and shifts the day in Brazil.
export class CalendarDate {
  private constructor(
    readonly year: number,
    readonly month: number,
    readonly day: number,
  ) {
    Object.freeze(this)
  }

  static fromISO(value: string): CalendarDate {
    const match = ISO_DATE.exec(value)
    if (!match) {
      throw new DomainError('CALENDAR_DATE_INVALID_FORMAT', `Expected a YYYY-MM-DD date, got "${value}"`)
    }
    return CalendarDate.fromParts(Number(match[1]), Number(match[2]), Number(match[3]))
  }

  static fromParts(year: number, month: number, day: number): CalendarDate {
    const isValid =
      Number.isInteger(year) &&
      Number.isInteger(month) &&
      Number.isInteger(day) &&
      year >= MIN_YEAR &&
      year <= MAX_YEAR &&
      month >= 1 &&
      month <= 12 &&
      day >= 1 &&
      day <= daysInMonth(year, month)

    if (!isValid) {
      throw new DomainError('CALENDAR_DATE_INVALID_VALUE', `Date does not exist: ${year}-${month}-${day}`)
    }
    return new CalendarDate(year, month, day)
  }

  toISO(): string {
    return `${this.monthKey()}-${String(this.day).padStart(2, '0')}`
  }

  monthKey(): string {
    return `${String(this.year).padStart(4, '0')}-${String(this.month).padStart(2, '0')}`
  }

  // Same day N months earlier, clamped to the last day of the target month (05-31 minus 3 is 02-28)
  subtractMonths(months: number): CalendarDate {
    const totalMonths = this.year * 12 + (this.month - 1) - months
    const year = Math.floor(totalMonths / 12)
    const month = totalMonths - year * 12 + 1
    return CalendarDate.fromParts(year, month, Math.min(this.day, daysInMonth(year, month)))
  }

  isAfter(other: CalendarDate): boolean {
    return this.compare(other) > 0
  }

  isBefore(other: CalendarDate): boolean {
    return this.compare(other) < 0
  }

  equals(other: CalendarDate): boolean {
    return this.compare(other) === 0
  }

  compare(other: CalendarDate): -1 | 0 | 1 {
    // Zero-padded ISO strings sort chronologically
    const a = this.toISO()
    const b = other.toISO()
    if (a < b) return -1
    if (a > b) return 1
    return 0
  }
}
