import { spawn, type ChildProcess } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll } from 'vitest'
import { HttpPasswordResetTokenRepository } from '../json-server/HttpPasswordResetTokenRepository'
import { HttpTransactionRepository } from '../json-server/HttpTransactionRepository'
import { HttpTransactionStatistics } from '../json-server/HttpTransactionStatistics'
import { HttpUserRepository } from '../json-server/HttpUserRepository'
import { InMemoryRateLimiter } from '../rate-limit/InMemoryRateLimiter'
import {
  describeResetTokenContract,
  describeTransactionRepositoryContract,
  describeUserRepositoryContract,
  type ContractContext,
} from './portContracts'
import { describeRateLimiterContract } from './rateLimiterContract'
import { describeUserSessionsContract } from './userSessionsContract'

// The json-server of the local development, started for this file only
const JSON_SERVER_BIN = fileURLToPath(new URL('../../../../node_modules/json-server/lib/bin.js', import.meta.url))
const HOST = '127.0.0.1'
// No transaction and no unique index: these hold only in Supabase
const CAPABILITIES = { uniqueEmail: false, atomicClaim: false }

let server: ChildProcess | undefined
let directory: string | undefined
let context: ContractContext | undefined
let sequence = 0

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, HOST, () => {
      const address = probe.address()
      probe.close(() => resolve(typeof address === 'object' && address ? address.port : 0))
    })
  })
}

async function waitUntilReady(url: string): Promise<void> {
  const deadline = Date.now() + 14_000
  while (Date.now() < deadline) {
    try {
      if ((await fetch(url)).ok) return
    } catch {
      // Not listening yet
    }
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error(`json-server did not start at ${url}`)
}

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'bytebank-contract-'))
  const database = join(directory, 'db.json')
  writeFileSync(database, JSON.stringify({ users: [], transactions: [], passwordResetTokens: [] }))
  const port = await freePort()
  const baseUrl = `http://${HOST}:${port}`
  server = spawn(process.execPath, [JSON_SERVER_BIN, database, '--host', HOST, '--port', String(port)], { stdio: 'ignore' })
  await waitUntilReady(`${baseUrl}/users`)
  context = {
    users: new HttpUserRepository(baseUrl),
    transactions: new HttpTransactionRepository(baseUrl),
    resetTokens: new HttpPasswordResetTokenRepository(baseUrl),
    statistics: new HttpTransactionStatistics(baseUrl),
    id: label => `contract-${label}-${(sequence += 1)}`,
    owners: () => ({ a: 'owner-a', b: 'owner-b' }),
  }
}, 15_000)

afterAll(async () => {
  if (server && server.exitCode === null) {
    await new Promise(resolve => {
      server?.once('exit', resolve)
      server?.kill()
    })
  }
  if (directory) rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})

const ready = (): ContractContext => {
  if (!context) throw new Error('json-server is not ready')
  return context
}

describeUserRepositoryContract('json-server', ready, CAPABILITIES)
describeUserSessionsContract('json-server', ready)
describeTransactionRepositoryContract('json-server', ready)
describeResetTokenContract('json-server', ready, CAPABILITIES)
describeRateLimiterContract('in memory', maxHits => new InMemoryRateLimiter({ maxHits, windowMs: 60_000 }), () => `key-${(sequence += 1)}`)
