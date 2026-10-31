#!/usr/bin/env node
// Prints the hash of the password read from stdin, in the format of ScryptPasswordHasher.
// From stdin and not an argument, so that the password stays out of the shell history.
// Usage: node packages/infrastructure/scripts/hash-password.mjs < file-with-the-password
import { randomBytes, scryptSync } from 'node:crypto'
import { readFileSync } from 'node:fs'

const N = 2 ** 17
const r = 8
const p = 1

const password = readFileSync(0, 'utf8').replace(/\r?\n$/, '')
if (password === '') {
  process.stderr.write('No password on stdin\n')
  process.exit(1)
}

const salt = randomBytes(16)
const key = scryptSync(password, salt, 32, { N, r, p, maxmem: 256 * N * r })
process.stdout.write(`scrypt$N=${N},r=${r},p=${p}$${salt.toString('base64url')}$${key.toString('base64url')}\n`)
