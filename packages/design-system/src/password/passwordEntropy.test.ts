import { describe, expect, it } from 'vitest'
import { effectiveLength, estimatePasswordBits, poolSize } from './passwordEntropy'

const pool = (password: string) => poolSize([...password])

describe('poolSize', () => {
  it.each([
    ['lower case', 'abc', 26],
    ['lower and upper case', 'aB', 52],
    ['letters and digits', 'aB3', 62],
    ['a symbol too', 'aB3#', 94],
    ['a space', 'a b', 27],
    ['an accented letter', 'açaí', 58],
    ['nothing', '', 0],
  ])('adds the pool of each class used: %s', (_, password, size) => {
    expect(pool(password)).toBe(size)
  })
})

describe('effectiveLength', () => {
  it('counts every character of a password with no pattern', () => {
    expect(effectiveLength('Xk9mQ2pR7tLw3Zb')).toBe(15)
  })

  it.each([
    ['one repeated character', 'aaaaaaaaaa', 1],
    ['a numeric sequence', '12345678', 1],
    ['a sequence backwards', 'zyxwvu', 1],
    ['an alphabetical sequence, in any case', 'aBcDeF', 1],
    ['keys next to each other', 'qwertyuiop', 1],
    ['a row of digits on the keyboard', '7890', 1],
  ])('counts a run as one character: %s', (_, password, length) => {
    expect(effectiveLength(password)).toBe(length)
  })

  it('leaves two characters in a row alone: they happen by chance', () => {
    expect(effectiveLength('ab9Kq')).toBe(5)
  })

  it('does not take a change of direction for a run', () => {
    expect(effectiveLength('aba121')).toBe(6)
  })

  it('follows a run that is both the next letter and the next key', () => {
    // "op" and "fg" are next to each other in the alphabet and on the keyboard
    expect(effectiveLength('qwertyuiop')).toBe(1)
    expect(effectiveLength('asdfghjkl')).toBe(1)
  })

  it('counts a repeated piece once', () => {
    // "Xk9m" + "Xk9m": the second one counts as one character
    expect(effectiveLength('Xk9mXk9m')).toBe(5)
  })

  it('counts a word of the context as one character', () => {
    expect(effectiveLength('julia7Kq', ['julia'])).toBe(4)
    expect(effectiveLength('JÚLIA7Kq', ['julia'])).toBe(4)
  })

  it('counts an emoji as one character', () => {
    expect(effectiveLength('🔒k🍍')).toBe(3)
  })
})

describe('estimatePasswordBits', () => {
  it('is the length times log2 of the pool, with no pattern', () => {
    expect(estimatePasswordBits('Xk9mQ2pR7tLw3Zb')).toBeCloseTo(15 * Math.log2(62))
  })

  it('discounts the sequences: abc123 is worth much less than its length', () => {
    expect(estimatePasswordBits('abcdef123456')).toBeCloseTo(2 * Math.log2(36))
  })

  it('is zero for an empty password', () => {
    expect(estimatePasswordBits('')).toBe(0)
  })
})
