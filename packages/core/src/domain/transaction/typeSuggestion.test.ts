import { describe, expect, it } from 'vitest'
import { DEPOSIT_SUGGESTION_MIN_CENTS, suggestTransactionType } from './typeSuggestion'

describe('suggestTransactionType', () => {
  it('suggests a deposit from R$ 1.000,00', () => {
    expect(DEPOSIT_SUGGESTION_MIN_CENTS).toBe(100_000)
    expect(suggestTransactionType(100_000)).toBe('deposit')
    expect(suggestTransactionType(250_000)).toBe('deposit')
  })

  it('suggests a payment below R$ 1.000,00', () => {
    expect(suggestTransactionType(99_999)).toBe('payment')
    expect(suggestTransactionType(1)).toBe('payment')
  })

  it.each([0, -100, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1])('suggests nothing for %s', amount => {
    expect(suggestTransactionType(amount)).toBeNull()
  })
})
