#!/usr/bin/env node
// data/db.json is the database in use, and data/db.seed.json is the versioned seed.
// A script and not a shell command, because npm runs scripts through cmd.exe on Windows.
import { copyFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const SEED = fileURLToPath(new URL('../data/db.seed.json', import.meta.url))
const DATABASE = fileURLToPath(new URL('../data/db.json', import.meta.url))

const [command] = process.argv.slice(2)

if (command === 'ensure') {
  if (!existsSync(DATABASE)) copyFileSync(SEED, DATABASE)
} else if (command === 'reset') {
  copyFileSync(SEED, DATABASE)
  // File changes do not reach the container through the bind mount on Windows
  process.stdout.write('Database reset. In Docker, run: docker compose restart json-server\n')
} else {
  process.stderr.write('Usage: node scripts/db.mjs <ensure|reset>\n')
  process.exit(1)
}
