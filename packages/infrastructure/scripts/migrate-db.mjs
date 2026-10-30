#!/usr/bin/env node
// Migrates the transactions of a json-server database to the Phase 4 format.
// The logic lives in src/migration; Vite loads that TypeScript for this script.
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'

const USAGE = 'Usage: node packages/infrastructure/scripts/migrate-db.mjs <input.json> <output.json> --user-id <id> [--in-place]'
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function print(text) {
  process.stdout.write(`${text}\n`)
}

function fail(message) {
  process.stderr.write(`${message}\n`)
  process.exit(1)
}

function readArguments() {
  try {
    const { values, positionals } = parseArgs({
      allowPositionals: true,
      options: { 'user-id': { type: 'string' }, 'in-place': { type: 'boolean', default: false } },
    })
    if (positionals.length !== 2 || !values['user-id']) fail(USAGE)
    return { input: positionals[0], output: positionals[1], userId: values['user-id'], inPlace: values['in-place'] }
  } catch (error) {
    return fail(`${error.message}\n${USAGE}`)
  }
}

function isSameFile(input, output) {
  return existsSync(output) && realpathSync.native(input) === realpathSync.native(output)
}

function readDatabase(path) {
  try {
    const database = JSON.parse(readFileSync(path, 'utf8'))
    if (!Array.isArray(database?.transactions)) fail(`No "transactions" list in ${path}`)
    return database
  } catch (error) {
    return fail(`Could not read ${path}: ${error.message}`)
  }
}

async function loadMigration() {
  const { runnerImport } = await import('vite')
  const { module } = await runnerImport(resolve(PACKAGE_ROOT, 'src/index.ts'), {
    configFile: false,
    logLevel: 'silent',
    root: PACKAGE_ROOT,
  })
  return module.migrateTransactions
}

const { input, output, userId, inPlace } = readArguments()
if (!existsSync(input)) fail(`Input file not found: ${input}`)
if (isSameFile(input, output) && !inPlace) {
  fail(`Refusing to overwrite the input file ${input}. Use --in-place to do it on purpose.`)
}

const database = readDatabase(input)
const migrateTransactions = await loadMigration()
const { transactions, errors, summary } = migrateTransactions(database.transactions, userId)

print(`Total: ${summary.total}`)
print(`Migrated: ${summary.migrated}`)
print(`Already in the new format: ${summary.alreadyMigrated}`)
print(`Errors: ${summary.errors}`)

if (errors.length > 0) {
  fail([...errors.map(({ id, message }) => `  ${id}: ${message}`), 'Nothing was written.'].join('\n'))
}

writeFileSync(output, `${JSON.stringify({ ...database, transactions }, null, 2)}\n`)
print(`Written to ${output}`)
