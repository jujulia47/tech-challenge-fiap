import { describe, expect, it } from 'vitest'
import {
  PASSWORD_MAX_LENGTH,
  assertPasswordAllowed,
  comparablePassword,
  findPasswordIssue,
  normalizePassword,
  passwordLength,
} from './passwordPolicy'

const context = { name: 'Júlia Borges', email: 'ana.souza@exemplo.com' }
const issue = (password: string, isListed = false) => findPasswordIssue(password, context, isListed)

describe('password policy', () => {
  describe('length', () => {
    it('refuses 7 characters and accepts 8', () => {
      expect(issue('k7#vQm2')).toBe('PASSWORD_TOO_SHORT')
      expect(issue('k7#vQm2x')).toBeNull()
    })

    it('refuses a listed password of 8 characters or more, however long', () => {
      expect(issue('senha12345', true)).toBe('PASSWORD_TOO_COMMON')
      expect(issue('password123', true)).toBe('PASSWORD_TOO_COMMON')
    })

    it('accepts the maximum and refuses one more', () => {
      const words = 'correct horse battery staple '.repeat(5)

      expect(issue(`${words}xyz`.slice(0, PASSWORD_MAX_LENGTH))).toBeNull()
      expect(issue(`${words}${words}`.slice(0, PASSWORD_MAX_LENGTH + 1))).toBe('PASSWORD_TOO_LONG')
    })

    it('counts an emoji as one character', () => {
      expect(passwordLength('🔒🔒')).toBe(2)
    })
  })

  describe('composition', () => {
    it.each(['todas minusculas aqui', 'SO MAIUSCULAS NESTA FRASE', 'quinze sem numero'])(
      'needs no symbol, number or capital: %s',
      password => {
        expect(issue(password)).toBeNull()
      },
    )
  })

  describe('Unicode', () => {
    it('accepts spaces, accents and emoji', () => {
      expect(issue('uma frase com açaí, café e 🍍🍍')).toBeNull()
    })

    it('normalizes with NFKC, so two spellings of one password are the same', () => {
      expect(normalizePassword('café')).toBe(normalizePassword('café'))
      expect(normalizePassword('ﬁ')).toBe('fi')
    })
  })

  describe('common passwords', () => {
    it('refuses what the list has, before the length', () => {
      expect(issue('password', true)).toBe('PASSWORD_TOO_COMMON')
    })

    it('compares without case, spaces or accents', () => {
      expect(comparablePassword(' Pass Wórd ')).toBe('password')
    })

    it.each(['aaaaaaaaaaaaaaaa', 'abcabcabcabcabcabc', 'passwordpassword', 'password password password'])(
      'refuses a repeated piece: %s',
      password => {
        expect(issue(password)).toBe('PASSWORD_TOO_COMMON')
      },
    )
  })

  describe('context words', () => {
    it.each([
      ['the name of the bank', 'minha senha do bytebank'],
      ['the name of the bank, in capitals', 'minha senha do BYTEBANK'],
      ['the name of the bank, with spaces', 'minha senha do byte bank'],
      ['the first name, without the accent', 'a senha da julia aqui'],
      ['the last name', 'senha com borges no meio'],
      ['a part of the email', 'a senha da souza aqui'],
      ['another part of the email', 'senha com o exemplo no meio'],
    ])('refuses %s', (_, password) => {
      expect(issue(password)).toBe('PASSWORD_HAS_PERSONAL_CONTEXT')
    })

    it('ignores pieces too short to mean anything', () => {
      const short = { name: 'Jo de Sá', email: 'jo@x.co' }

      expect(findPasswordIssue('dejosa em uma frase longa', short)).toBeNull()
    })
  })

  describe('assertPasswordAllowed', () => {
    it('accepts a long phrase', () => {
      expect(() => assertPasswordAllowed('correct horse battery staple', context, false)).not.toThrow()
    })

    it('throws the code of the issue, with no password in the message', () => {
      expect(() => assertPasswordAllowed('curta', context, false)).toThrow(
        expect.objectContaining({ code: 'PASSWORD_TOO_SHORT', message: 'The password does not follow the policy' }),
      )
    })
  })
})
