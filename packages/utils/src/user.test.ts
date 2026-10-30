import { describe, expect, it } from 'vitest'
import { getFirstName } from './user'

describe('getFirstName', () => {
  it('returns the first word of a full name', () => {
    expect(getFirstName('Julia Borges')).toBe('Julia')
  })

  it('returns the name itself when there is a single word', () => {
    expect(getFirstName('Julia')).toBe('Julia')
  })

  it('ignores leading and trailing whitespace', () => {
    expect(getFirstName('  Julia Borges ')).toBe('Julia')
  })

  it('handles more than one space between names', () => {
    expect(getFirstName('Ana  Maria')).toBe('Ana')
  })

  it('keeps hyphenated first names together', () => {
    expect(getFirstName('Maria-Clara Souza')).toBe('Maria-Clara')
  })

  it('returns an empty string for an empty or blank name', () => {
    expect(getFirstName('')).toBe('')
    expect(getFirstName('   ')).toBe('')
  })

  // Characterization: current behavior, see docs/fase4/testing.md
  it('splits only on the space character, not on tabs or line breaks', () => {
    expect(getFirstName('Ana\tMaria')).toBe('Ana\tMaria')
    expect(getFirstName('Ana\nMaria')).toBe('Ana\nMaria')
  })
})
