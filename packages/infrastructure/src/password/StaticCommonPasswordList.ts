import type { CommonPasswordList } from '@bytebank/core'
import commonPasswords from './common-passwords.json'
import portugueseWords from './common-passwords-pt.json'

// The 10,000 most common passwords from SecLists (MIT), and a short list of Portuguese words that
// the English list lacks, chosen by hand. Credit and limits in docs/fase4/security.md.
// In this package, so it never reaches a browser bundle.
let listed: Set<string> | undefined

// A listed word with digits or symbols around it is as easy to guess as the word itself:
// password123, senha12345, 2024brasil!. Shorter words are left alone, so that a random
// password does not fail on three letters that happen to make a word.
const AROUND_A_WORD = /^[^\p{L}]*(.*?)[^\p{L}]*$/u
const MIN_WORD_LENGTH = 4

export class StaticCommonPasswordList implements CommonPasswordList {
  async has(comparablePassword: string): Promise<boolean> {
    listed ??= new Set([...commonPasswords, ...portugueseWords])
    if (listed.has(comparablePassword)) return true
    const word = AROUND_A_WORD.exec(comparablePassword)?.[1] ?? ''
    return word !== comparablePassword && [...word].length >= MIN_WORD_LENGTH && listed.has(word)
  }
}
