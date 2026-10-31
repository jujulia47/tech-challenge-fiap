import { describe, expect, it } from 'vitest'
import { passwordStrength } from './passwordStrength'

describe('passwordStrength', () => {
  it('has no state for an empty field', () => {
    expect(passwordStrength('')).toBeNull()
  })

  it.each([
    ['short', 'curta demais', 'weak'],
    ['at the minimum', 'quinze letras a', 'good'],
    ['long', 'uma frase longa e facil de lembrar', 'strong'],
  ])('is right for a password that is %s', (_, password, strength) => {
    expect(passwordStrength(password)).toBe(strength)
  })

  it('is weak with a word of the context, however long', () => {
    expect(passwordStrength('uma frase longa com o nome da julia', { name: 'Julia', email: 'j@x.co' })).toBe('weak')
  })

  it('is weak when the server refused it as common', () => {
    expect(passwordStrength('uma frase longa e facil de lembrar', undefined, true)).toBe('weak')
  })
})
