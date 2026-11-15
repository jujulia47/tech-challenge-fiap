#!/usr/bin/env node
// data/db.json is the database in use, and data/db.seed.json is the versioned seed.
// A script and not a shell command, because npm runs scripts through cmd.exe on Windows.
import { spawn } from 'node:child_process'
import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SEED = fileURLToPath(new URL('../data/db.seed.json', import.meta.url))
const DATABASE = fileURLToPath(new URL('../data/db.json', import.meta.url))
const SHELL = fileURLToPath(new URL('..', import.meta.url))
const JSON_SERVER_BIN = fileURLToPath(new URL('../../../node_modules/json-server/lib/bin.js', import.meta.url))

const [command] = process.argv.slice(2)

if (command === 'ensure') {
  if (!existsSync(DATABASE)) copyFileSync(SEED, DATABASE)
} else if (command === 'serve') {
  if (!existsSync(DATABASE)) copyFileSync(SEED, DATABASE)
  // Without its file watcher (NODE_ENV=production): it reloads db.json after a write and, under
  // load, the reload undoes the next PATCH (docs/fase4/testing.md, "Known instabilities").
  // From apps/shell, which has the public folder that production mode serves.
  const server = spawn(process.execPath, [JSON_SERVER_BIN, DATABASE, '--port', '3001'], {
    cwd: SHELL,
    env: { ...process.env, NODE_ENV: 'production' },
    stdio: 'inherit',
  })
  server.on('exit', code => process.exit(code ?? 0))
} else if (command === 'reset') {
  copyFileSync(SEED, DATABASE)
  // json-server keeps the data in memory and does not watch the file
  process.stdout.write('Database reset. Restart json-server: docker compose restart json-server, or npm run api again\n')
} else {
  process.stderr.write('Usage: node scripts/db.mjs <ensure|serve|reset>\n')
  process.exit(1)
}
