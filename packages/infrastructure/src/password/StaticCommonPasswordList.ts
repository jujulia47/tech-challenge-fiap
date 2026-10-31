import type { CommonPasswordList } from '@bytebank/core'
import commonPasswords from './common-passwords.json'

// The 10,000 most common passwords from SecLists (MIT). Credit in docs/fase4/security.md.
// In this package, so it never reaches a browser bundle.
let listed: Set<string> | undefined

export class StaticCommonPasswordList implements CommonPasswordList {
  async has(comparablePassword: string): Promise<boolean> {
    listed ??= new Set(commonPasswords)
    return listed.has(comparablePassword)
  }
}
