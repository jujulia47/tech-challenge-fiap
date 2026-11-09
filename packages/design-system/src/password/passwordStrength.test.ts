import { describe, expect, it } from 'vitest'
import { STRENGTH_THRESHOLDS, passwordStrength, strengthOfBits } from './passwordStrength'

// Passwords as a password manager makes them: 15 random letters and digits
const GENERATED = ['Xk9mQ2pR7tLw3Zb', 'hT4vN8qWz2LcR6y', 'pM3xK7bQ9wE2rT5', 'Zs8Lq2Vn6Hx4Jw9']

// mulberry32: the same passwords on every run, so the test cannot flake
function seededRandom(seed: number): () => number {
  let state = seed
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let value = Math.imul(state ^ (state >>> 15), 1 | state)
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

const random = seededRandom(372209)

function randomPassword(length: number, alphabet: string): string {
  return Array.from({ length }, () => alphabet[Math.floor(random() * alphabet.length)]).join('')
}

describe('passwordStrength', () => {
  it('has no state for an empty field', () => {
    expect(passwordStrength('')).toBeNull()
  })

  it.each(GENERATED)('puts a generated password of 15 letters and digits at the top: %s', password => {
    expect(passwordStrength(password)).toBe('strong')
  })

  it('puts nearly every random password of 15 letters and digits at the top', () => {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const strong = Array.from({ length: 1000 }, () => randomPassword(15, alphabet)).filter(
      password => passwordStrength(password) === 'strong',
    )
    // A run of 3 by chance still leaves it strong; a longer one is rare
    expect(strong.length).toBeGreaterThanOrEqual(995)
  })

  it.each([
    ['one repeated letter', 'aaaaaaaaaa'],
    ['a sequence of digits', '12345678'],
    ['a sequence with a few letters', 'abcdefgh12345678'],
    ['keys in a row', 'qwertyuiopasdfgh'],
  ])('is weak with %s, whatever its length', (_, password) => {
    expect(passwordStrength(password)).toBe('weak')
  })

  it.each([
    ['8 random characters with symbols', 'k7#vQm2x', 'fair'],
    ['11 random letters and digits', 'Xk9mQ2pR7tL', 'good'],
    ['a long phrase', 'girassol trovoada caneca violeta', 'strong'],
  ])('rates %s as %s', (_, password, strength) => {
    expect(passwordStrength(password)).toBe(strength)
  })

  it('is weak below the minimum of the domain', () => {
    expect(passwordStrength('k7#vQm2')).toBe('weak')
  })

  it('is weak with a word of the context, however long', () => {
    expect(passwordStrength('uma frase longa com o nome da julia', { name: 'Julia', email: 'j@x.co' })).toBe('weak')
  })

  it('is weak when the server refused it as common', () => {
    expect(passwordStrength('uma frase longa e facil de lembrar', undefined, true)).toBe('weak')
  })
})

describe('strengthOfBits', () => {
  it('uses the documented limits', () => {
    expect(strengthOfBits(STRENGTH_THRESHOLDS.fair - 0.1)).toBe('weak')
    expect(strengthOfBits(STRENGTH_THRESHOLDS.fair)).toBe('fair')
    expect(strengthOfBits(STRENGTH_THRESHOLDS.good)).toBe('good')
    expect(strengthOfBits(STRENGTH_THRESHOLDS.strong)).toBe('strong')
  })
})
