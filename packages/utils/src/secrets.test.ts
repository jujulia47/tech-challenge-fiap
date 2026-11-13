import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { assertSecrets, exitUnlessSecrets, isUsableSecret, secretMessage } from './secrets'

// Made here, like the README tells: 32 random bytes in base64
const GOOD = btoa(String.fromCharCode(...Array.from({ length: 32 }, (_, index) => (index * 37 + 11) % 256)))

describe('isUsableSecret', () => {
  it('takes 32 random bytes in base64, the command of the README', () => {
    expect(GOOD).toHaveLength(44)
    expect(isUsableSecret(GOOD)).toBe(true)
  })

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['blank', '   '],
    ['the example of .env.example', 'replace-me'],
    ['the example with spaces', ' replace-me '],
    ['31 bytes', btoa('x'.repeat(31))],
    ['a short password', 'bytebank123'],
    ['not base64', '!!!! não é base64 !!!!'.repeat(4)],
  ])('refuses a secret that is %s', (_, value) => {
    expect(isUsableSecret(value)).toBe(false)
  })
})

describe('assertSecrets', () => {
  it('passes when every secret is usable', () => {
    expect(() => assertSecrets({ NEXTAUTH_SECRET: GOOD, ATTACHMENT_ENCRYPTION_KEY: GOOD }, ['NEXTAUTH_SECRET', 'ATTACHMENT_ENCRYPTION_KEY'])).not.toThrow()
  })

  it('names each bad secret, with the step of the README, and never the value', () => {
    const run = () => assertSecrets({ NEXTAUTH_SECRET: 'replace-me', ATTACHMENT_ENCRYPTION_KEY: GOOD }, ['NEXTAUTH_SECRET', 'ATTACHMENT_ENCRYPTION_KEY'])

    expect(run).toThrow(secretMessage('NEXTAUTH_SECRET'))
    expect(run).not.toThrow(/ATTACHMENT_ENCRYPTION_KEY|replace-me/)
  })

  it('only checks the secrets the app uses: the shell has no attachment key', () => {
    expect(() => assertSecrets({ NEXTAUTH_SECRET: GOOD }, ['NEXTAUTH_SECRET'])).not.toThrow()
  })

  it('gives the same message as docker-compose.yml when the variable is missing', () => {
    const compose = readFileSync(new URL('../../../docker-compose.yml', import.meta.url), 'utf8')

    expect(compose).toContain(`\${NEXTAUTH_SECRET:?${secretMessage('NEXTAUTH_SECRET')}}`)
    expect(compose).toContain(`\${ATTACHMENT_ENCRYPTION_KEY:?${secretMessage('ATTACHMENT_ENCRYPTION_KEY')}}`)
  })
})

describe('exitUnlessSecrets', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  function spies() {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
    return { exit, stderr }
  }

  it('lets the Node server start with good secrets', () => {
    const { exit } = spies()

    exitUnlessSecrets({ NEXTAUTH_SECRET: GOOD }, ['NEXTAUTH_SECRET'], 'nodejs')

    expect(exit).not.toHaveBeenCalled()
  })

  it('stops the Node server with the message, instead of answering 500 to every request', () => {
    const { exit, stderr } = spies()

    exitUnlessSecrets({ NEXTAUTH_SECRET: 'replace-me' }, ['NEXTAUTH_SECRET'], 'nodejs')

    expect(stderr).toHaveBeenCalledWith(`${secretMessage('NEXTAUTH_SECRET')}\n`)
    expect(exit).toHaveBeenCalledWith(1)
  })

  it('throws in another runtime, which has no process to stop', () => {
    const { exit } = spies()

    expect(() => exitUnlessSecrets({}, ['NEXTAUTH_SECRET'], 'edge')).toThrow(secretMessage('NEXTAUTH_SECRET'))
    expect(exit).not.toHaveBeenCalled()
  })
})

describe('secrets.ts', () => {
  it('has no imports, so docker-compose.yml can run it with plain Node', () => {
    expect(readFileSync(new URL('./secrets.ts', import.meta.url), 'utf8')).not.toMatch(/^import /m)
  })
})
