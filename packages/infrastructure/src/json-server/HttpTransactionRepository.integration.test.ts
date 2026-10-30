import { spawn, type ChildProcess } from 'node:child_process'
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Transaction } from '@bytebank/core'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { HttpTransactionRepository } from './HttpTransactionRepository'

// Runs against the installed json-server: the unit tests simulate fetch, so
// only this file proves that the assumptions about the server still hold.
const FIXTURE = fileURLToPath(new URL('./integration-db.json', import.meta.url))
const JSON_SERVER_BIN = fileURLToPath(new URL('../../../../node_modules/json-server/lib/bin.js', import.meta.url))
const STARTUP_TIMEOUT = 15_000
// Explicit, because "localhost" may resolve to IPv6 on some systems
const HOST = '127.0.0.1'

let server: ChildProcess | undefined
let directory: string | undefined
let baseUrl: string
let repository: HttpTransactionRepository

function findFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const probe = createServer()
    probe.once('error', reject)
    probe.listen(0, HOST, () => {
      const address = probe.address()
      const port = typeof address === 'object' && address !== null ? address.port : 0
      probe.close(() => resolve(port))
    })
  })
}

async function waitUntilReady(url: string): Promise<void> {
  const deadline = Date.now() + STARTUP_TIMEOUT - 1_000
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

function stop(child: ChildProcess): Promise<void> {
  return new Promise(resolve => {
    if (child.exitCode !== null) {
      resolve()
      return
    }
    child.once('exit', () => resolve())
    child.kill()
  })
}

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'bytebank-json-server-'))
  const database = join(directory, 'db.json')
  copyFileSync(FIXTURE, database)

  const port = await findFreePort()
  baseUrl = `http://${HOST}:${port}`
  server = spawn(process.execPath, [JSON_SERVER_BIN, database, '--host', HOST, '--port', String(port)], {
    stdio: 'ignore',
  })
  await waitUntilReady(`${baseUrl}/transactions`)
  repository = new HttpTransactionRepository(baseUrl)
}, STARTUP_TIMEOUT)

afterAll(async () => {
  if (server) await stop(server)
  if (directory) rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})

const newTransaction = (userId: string) =>
  Transaction.fromPrimitives({
    id: 'client-generated-id',
    userId,
    type: 'deposit',
    amountInCents: 500,
    date: '2026-03-01',
  })

describe('HttpTransactionRepository against a real json-server', () => {
  describe('findAllByUser', () => {
    it('matches a numeric-looking user id stored as a string', async () => {
      const found = await repository.findAllByUser('1')

      expect(found.map(t => t.id).sort()).toEqual(['a', 'b'])
    })

    it('does not confuse user "1" with user "10"', async () => {
      const found = await repository.findAllByUser('10')

      expect(found.map(t => t.id)).toEqual(['c'])
    })

    it('returns nothing for an unknown user', async () => {
      await expect(repository.findAllByUser('nobody')).resolves.toEqual([])
    })
  })

  describe('findById', () => {
    it('finds a transaction of the user', async () => {
      const found = await repository.findById('a', '1')

      expect(found?.amount.toCents()).toBe(15000)
    })

    it('returns null for a transaction of another user', async () => {
      await expect(repository.findById('d', '1')).resolves.toBeNull()
    })

    it('returns null for an id that does not exist', async () => {
      await expect(repository.findById('missing', '1')).resolves.toBeNull()
    })
  })

  describe('create', () => {
    it('returns the id assigned by the server, which can be read back', async () => {
      const created = await repository.create(newTransaction('3'))

      expect(created.id).not.toBe('client-generated-id')
      const found = await repository.findById(created.id, '3')
      expect(found?.toPrimitives()).toEqual(created.toPrimitives())
    })
  })

  describe('update', () => {
    it('stores the change for the owner', async () => {
      const created = await repository.create(newTransaction('4'))

      await repository.update(created.update({ type: 'payment' }))

      expect((await repository.findById(created.id, '4'))?.type).toBe('payment')
    })

    it('is blocked for another user and changes nothing', async () => {
      const victim = await repository.findById('d', '2')
      const forged = Transaction.fromPrimitives({ ...victim!.toPrimitives(), userId: '1', amountInCents: 1 })

      await expect(repository.update(forged)).rejects.toMatchObject({ code: 'TRANSACTION_NOT_FOUND' })
      expect((await repository.findById('d', '2'))?.amount.toCents()).toBe(200)
    })
  })

  describe('delete', () => {
    it('removes the transaction of the owner', async () => {
      const created = await repository.create(newTransaction('5'))

      await repository.delete(created.id, '5')

      await expect(repository.findById(created.id, '5')).resolves.toBeNull()
    })

    it('is blocked for another user and keeps the transaction', async () => {
      await expect(repository.delete('d', '1')).rejects.toMatchObject({ code: 'TRANSACTION_NOT_FOUND' })
      await expect(repository.findById('d', '2')).resolves.not.toBeNull()
    })
  })
})
