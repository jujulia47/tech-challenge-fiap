import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import * as fromSubpath from '@bytebank/bff/client'
import * as bff from '../index'
import { createShellClient } from './createShellClient'
import { createTransactionsClient } from './createTransactionsClient'

describe('@bytebank/bff/client', () => {
  it('exposes both clients through the subpath', () => {
    expect(fromSubpath.createTransactionsClient).toBe(createTransactionsClient)
    expect(fromSubpath.createShellClient).toBe(createShellClient)
  })

  it.each(['createTransactionsClient', 'createShellClient'])('keeps %s out of the main entry, which is server code', name => {
    expect(bff).not.toHaveProperty(name)
  })

  it.each(['./createTransactionsClient.ts', './createShellClient.ts', './http.ts', './index.ts'])(
    'imports types, or values of this folder only, so no server code can reach the browser: %s',
    file => {
      const source = readFileSync(new URL(file, import.meta.url), 'utf8')

      expect(source).not.toMatch(/^import (?!type )(?!.* from '\.\/)/m)
      expect(source).not.toMatch(/^export .* from '(?!\.\/)/m)
      expect(source).not.toMatch(/\bimport\(|\brequire\(/)
    },
  )

  it('has no server-only, which would break it in the browser', () => {
    for (const file of ['./createTransactionsClient.ts', './createShellClient.ts', './http.ts', './index.ts']) {
      expect(readFileSync(new URL(file, import.meta.url), 'utf8')).not.toContain('server-only')
    }
  })
})
