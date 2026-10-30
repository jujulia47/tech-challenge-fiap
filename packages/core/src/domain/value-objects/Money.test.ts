import { describe, expect, it } from 'vitest'
import { Money } from './Money'

const invalidCents = expect.objectContaining({ code: 'MONEY_INVALID_CENTS' })

describe('Money', () => {
  describe('fromCents', () => {
    it.each([0, 1, 15000, -15000, Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER])('accepts %d', cents => {
      expect(Money.fromCents(cents).toCents()).toBe(cents)
    })

    it.each([
      0.5,
      150.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 1,
      Number.MIN_SAFE_INTEGER - 1,
    ])('rejects %d', cents => {
      expect(() => Money.fromCents(cents)).toThrow(invalidCents)
    })

    it('normalizes -0 to 0', () => {
      expect(Object.is(Money.fromCents(-0).toCents(), 0)).toBe(true)
    })
  })

  it('zero() is zero', () => {
    expect(Money.zero().toCents()).toBe(0)
    expect(Money.zero().isZero()).toBe(true)
  })

  describe('arithmetic', () => {
    it('adds', () => {
      expect(Money.fromCents(15000).add(Money.fromCents(50)).toCents()).toBe(15050)
    })

    it('subtracts, going negative when needed', () => {
      expect(Money.fromCents(100).subtract(Money.fromCents(350)).toCents()).toBe(-250)
    })

    it('negates', () => {
      expect(Money.fromCents(100).negate().toCents()).toBe(-100)
      expect(Money.fromCents(-100).negate().toCents()).toBe(100)
    })

    it('never produces -0', () => {
      expect(Object.is(Money.zero().negate().toCents(), 0)).toBe(true)
      expect(Object.is(Money.fromCents(5).subtract(Money.fromCents(5)).toCents(), 0)).toBe(true)
    })

    it('rejects results outside the safe integer range', () => {
      const max = Money.fromCents(Number.MAX_SAFE_INTEGER)
      const min = Money.fromCents(Number.MIN_SAFE_INTEGER)

      expect(() => max.add(Money.fromCents(1))).toThrow(invalidCents)
      expect(() => min.subtract(Money.fromCents(1))).toThrow(invalidCents)
    })

    it('adds without floating-point drift', () => {
      expect(Money.fromCents(10).add(Money.fromCents(20)).toCents()).toBe(30)
    })
  })

  it('returns new instances and leaves the operands unchanged', () => {
    const a = Money.fromCents(100)
    const b = Money.fromCents(50)
    const sum = a.add(b)

    expect(sum).not.toBe(a)
    expect(a.negate()).not.toBe(a)
    expect(a.subtract(b)).not.toBe(a)
    expect(a.toCents()).toBe(100)
    expect(b.toCents()).toBe(50)
  })

  it('is frozen at runtime', () => {
    expect(Object.isFrozen(Money.fromCents(100))).toBe(true)
  })

  describe('sign checks', () => {
    it.each([
      [0, true, false, false],
      [1, false, false, true],
      [-1, false, true, false],
    ])('%d: isZero %s, isNegative %s, isPositive %s', (cents, zero, negative, positive) => {
      const money = Money.fromCents(cents)

      expect(money.isZero()).toBe(zero)
      expect(money.isNegative()).toBe(negative)
      expect(money.isPositive()).toBe(positive)
    })
  })

  describe('comparison', () => {
    it('equals compares by value', () => {
      expect(Money.fromCents(100).equals(Money.fromCents(100))).toBe(true)
      expect(Money.fromCents(100).equals(Money.fromCents(101))).toBe(false)
    })

    it('compare returns -1, 0 or 1', () => {
      expect(Money.fromCents(1).compare(Money.fromCents(2))).toBe(-1)
      expect(Money.fromCents(2).compare(Money.fromCents(2))).toBe(0)
      expect(Money.fromCents(3).compare(Money.fromCents(2))).toBe(1)
    })
  })
})
