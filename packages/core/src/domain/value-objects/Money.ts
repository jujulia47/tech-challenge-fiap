import { DomainError } from '../errors/DomainError'

// Amount in integer cents. Formatting is a presentation concern and lives outside the domain.
export class Money {
  private readonly cents: number

  private constructor(cents: number) {
    // Normalizes -0, which would otherwise leak through arithmetic and negate()
    this.cents = cents === 0 ? 0 : cents
    Object.freeze(this)
  }

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents)) {
      throw new DomainError('MONEY_INVALID_CENTS', `Money must be a safe integer of cents, got ${cents}`)
    }
    return new Money(cents)
  }

  static zero(): Money {
    return new Money(0)
  }

  toCents(): number {
    return this.cents
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents)
  }

  subtract(other: Money): Money {
    return Money.fromCents(this.cents - other.cents)
  }

  negate(): Money {
    return new Money(-this.cents)
  }

  isZero(): boolean {
    return this.cents === 0
  }

  isNegative(): boolean {
    return this.cents < 0
  }

  isPositive(): boolean {
    return this.cents > 0
  }

  equals(other: Money): boolean {
    return this.cents === other.cents
  }

  compare(other: Money): -1 | 0 | 1 {
    if (this.cents < other.cents) return -1
    if (this.cents > other.cents) return 1
    return 0
  }
}
