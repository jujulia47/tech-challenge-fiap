import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = fileURLToPath(new URL('../../scripts/migrate-db.mjs', import.meta.url))
const TIMEOUT = 30_000

const legacy = { id: '1', date: '18/11/2022', label: 'Depósito', amount: 'R$ 150,00', month: 'novembro' }
const migrated = { id: '1', userId: '1', type: 'deposit', amountInCents: 15000, date: '2022-11-18' }
const users = [{ id: '1', name: 'Test User', email: 'test@example.com' }]

let dir: string
let input: string
let output: string

function run(...args: string[]) {
  return spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' })
}

function writeInput(transactions: unknown[]) {
  writeFileSync(input, JSON.stringify({ transactions, users }))
}

const readJson = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as unknown

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'bytebank-migrate-'))
  input = join(dir, 'input.json')
  output = join(dir, 'output.json')
})

afterEach(() => {
  rmSync(dir, { recursive: true, force: true })
})

describe('migrate-db.mjs', () => {
  it('migrates into the output file, keeps other collections and prints a summary', { timeout: TIMEOUT }, () => {
    writeInput([legacy, migrated])
    const before = readFileSync(input, 'utf8')

    const result = run(input, output, '--user-id', '1')

    expect(result.status).toBe(0)
    expect(readJson(output)).toEqual({ transactions: [migrated, migrated], users })
    expect(readFileSync(input, 'utf8')).toBe(before)
    expect(result.stdout).toContain('Total: 2')
    expect(result.stdout).toContain('Migrated: 1')
    expect(result.stdout).toContain('Already in the new format: 1')
    expect(result.stdout).toContain('Errors: 0')
  })

  it('writes nothing and exits with 1 when any record has an error', { timeout: TIMEOUT }, () => {
    writeInput([
      legacy,
      { ...legacy, id: '2', label: 'Pix' },
      { ...legacy, id: '3', amount: '-R$ 10,00' },
    ])

    const result = run(input, output, '--user-id', '1')

    expect(result.status).toBe(1)
    expect(existsSync(output)).toBe(false)
    expect(result.stdout).toContain('Errors: 2')
    expect(result.stderr).toContain('2: Unknown label: "Pix"')
    expect(result.stderr).toContain('3: negative amount: the domain stores magnitudes; review this record manually')
    expect(result.stderr).toContain('Nothing was written.')
  })

  it('refuses to overwrite the input without --in-place', { timeout: TIMEOUT }, () => {
    writeInput([legacy])
    const before = readFileSync(input, 'utf8')

    const result = run(input, input, '--user-id', '1')

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Refusing to overwrite the input file')
    expect(readFileSync(input, 'utf8')).toBe(before)
  })

  it('refuses the same file written as a different path', { timeout: TIMEOUT }, () => {
    writeInput([legacy])

    const result = run(input, join(dir, '.', 'sub', '..', 'input.json'), '--user-id', '1')

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Refusing to overwrite the input file')
  })

  it('overwrites the input with --in-place', { timeout: TIMEOUT }, () => {
    writeInput([legacy])

    const result = run(input, input, '--user-id', '1', '--in-place')

    expect(result.status).toBe(0)
    expect(readJson(input)).toEqual({ transactions: [migrated], users })
  })

  it('does not write the input with --in-place when there are errors', { timeout: TIMEOUT }, () => {
    writeInput([{ ...legacy, label: 'Pix' }])
    const before = readFileSync(input, 'utf8')

    const result = run(input, input, '--user-id', '1', '--in-place')

    expect(result.status).toBe(1)
    expect(readFileSync(input, 'utf8')).toBe(before)
  })

  it('is idempotent', { timeout: TIMEOUT }, () => {
    writeInput([legacy])
    run(input, output, '--user-id', '1')
    const once = readFileSync(output, 'utf8')

    const result = run(output, join(dir, 'twice.json'), '--user-id', '1')

    expect(result.stdout).toContain('Already in the new format: 1')
    expect(readFileSync(join(dir, 'twice.json'), 'utf8')).toBe(once)
  })

  it.each([
    ['no arguments', []],
    ['a missing --user-id', ['a.json', 'b.json']],
    ['a missing output', ['a.json', '--user-id', '1']],
    ['an unknown option', ['a.json', 'b.json', '--user-id', '1', '--force']],
  ])('prints the usage for %s', (_, args) => {
    const result = run(...args)

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Usage:')
  })

  it('reports a missing input file', () => {
    const result = run(input, output, '--user-id', '1')

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Input file not found')
  })

  it('reports invalid JSON', () => {
    writeFileSync(input, '{ not json')

    const result = run(input, output, '--user-id', '1')

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('Could not read')
    expect(existsSync(output)).toBe(false)
  })

  it('reports a database without transactions', () => {
    writeFileSync(input, JSON.stringify({ users }))

    const result = run(input, output, '--user-id', '1')

    expect(result.status).toBe(1)
    expect(result.stderr).toContain('No "transactions" list')
  })
})
