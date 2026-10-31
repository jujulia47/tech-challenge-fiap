import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ScryptPasswordHasher } from './ScryptPasswordHasher'

const SCRIPT = fileURLToPath(new URL('../../scripts/hash-password.mjs', import.meta.url))
const run = (input: string) => spawnSync(process.execPath, [SCRIPT], { input, encoding: 'utf8' })

describe('hash-password.mjs', () => {
  it('prints a hash the application accepts', async () => {
    const { stdout, status } = run('secret\n')

    expect(status).toBe(0)
    await expect(new ScryptPasswordHasher().verify('secret', stdout.trim())).resolves.toBe(true)
  })

  it('refuses an empty password', () => {
    const { stderr, status } = run('')

    expect(status).toBe(1)
    expect(stderr).toContain('No password')
  })
})
