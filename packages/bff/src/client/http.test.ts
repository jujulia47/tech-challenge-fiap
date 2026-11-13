import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { UNKNOWN_ERROR, errorCode } from './http'

describe('errorCode', () => {
  it('reads the code of the bff, as { error: CODE }', async () => {
    await expect(errorCode(new Response(JSON.stringify({ error: 'RATE_LIMITED' }), { status: 429 }))).resolves.toBe('RATE_LIMITED')
  })

  it('uses UNKNOWN_ERROR for a body that is not JSON', async () => {
    await expect(errorCode(new Response('<html>', { status: 500 }))).resolves.toBe(UNKNOWN_ERROR)
  })

  it('uses UNKNOWN_ERROR for a JSON body without a code', async () => {
    await expect(errorCode(new Response('{}', { status: 500 }))).resolves.toBe('UNKNOWN_ERROR')
  })
})

describe('http.ts', () => {
  it('has no imports, so the clients that share it stay free of server code', () => {
    expect(readFileSync(new URL('./http.ts', import.meta.url), 'utf8')).not.toMatch(/^import /m)
  })
})
