import { describe, expect, it } from 'vitest'
import { formatCents } from './currency'

describe('formatCents', () => {
  it('formats zero', () => {
    expect(formatCents(0)).toBe('0,00')
  })

  it('formats values below one real', () => {
    expect(formatCents(1)).toBe('0,01')
    expect(formatCents(99)).toBe('0,99')
  })

  it('formats whole reais with two decimal places', () => {
    expect(formatCents(100)).toBe('1,00')
    expect(formatCents(15000)).toBe('150,00')
  })

  it('formats values with cents', () => {
    expect(formatCents(12345)).toBe('123,45')
  })

  it('uses a dot as thousands separator and a comma as decimal separator', () => {
    expect(formatCents(250000)).toBe('2.500,00')
    expect(formatCents(123456)).toBe('1.234,56')
    expect(formatCents(100000000)).toBe('1.000.000,00')
  })

  it('formats large values', () => {
    expect(formatCents(123456789012)).toBe('1.234.567.890,12')
  })

  it('does not include the currency symbol (callers prepend "R$ ")', () => {
    expect(`R$ ${formatCents(15000)}`).toBe('R$ 150,00')
  })

  it('formats negative values with a leading minus sign', () => {
    expect(formatCents(-15000)).toBe('-150,00')
  })

  // Characterization: current behavior, see docs/fase4/testing.md
  it('formats negative zero as "-0,00"', () => {
    expect(formatCents(-0)).toBe('-0,00')
  })

  // Characterization: current behavior, see docs/fase4/testing.md
  it('rounds fractional cents half away from zero instead of rejecting them', () => {
    expect(formatCents(0.5)).toBe('0,01')
    expect(formatCents(150.5)).toBe('1,51')
  })

  // Characterization: current behavior, see docs/fase4/testing.md
  it('returns locale output for non-finite input instead of throwing', () => {
    expect(formatCents(Number.NaN)).toBe('NaN')
    expect(formatCents(Number.POSITIVE_INFINITY)).toBe('∞')
  })

  // Characterization: current behavior, see docs/fase4/testing.md
  it('loses precision near Number.MAX_SAFE_INTEGER because it divides by 100', () => {
    // 9007199254740991 cents should be 90.071.992.547.409,91
    expect(formatCents(Number.MAX_SAFE_INTEGER)).toBe('90.071.992.547.409,90')
  })
})
