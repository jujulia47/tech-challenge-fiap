import { spawn, type ChildProcess } from 'node:child_process'
import { copyFileSync, mkdtempSync, rmSync } from 'node:fs'
import { createServer, type AddressInfo, type Socket } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import {
  createTransactionHandlers,
  type Logger,
  type TransactionHandlers,
} from '../http/createTransactionHandlers'
import { MAX_ATTACHMENT_BYTES } from '../http/limits'
import { ALLOWED_ORIGIN, dataUrl } from '../testing/handlerHarness'
import { createJsonServerUseCases } from './createJsonServerUseCases'

// Handlers, use cases and adapters together, against the installed json-server
const FIXTURE = fileURLToPath(new URL('./e2e-db.json', import.meta.url))
const JSON_SERVER_BIN = fileURLToPath(new URL('../../../../node_modules/json-server/lib/bin.js', import.meta.url))
const STARTUP_TIMEOUT = 15_000
// Explicit, because "localhost" may resolve to IPv6 on some systems
const HOST = '127.0.0.1'
const ENDPOINT = 'http://bff.test/transactions'
const USER_HEADER = 'X-Test-User'

let server: ChildProcess | undefined
let directory: string | undefined
let baseUrl: string
let handlers: TransactionHandlers

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

function handlersFor(serverUrl: string, logger?: Logger, timeoutMs?: number): TransactionHandlers {
  return createTransactionHandlers({
    // The zones read the session here
    getUserId: async request => request.headers.get(USER_HEADER),
    useCases: createJsonServerUseCases({ baseUrl: serverUrl, timeoutMs }),
    allowedOrigins: [ALLOWED_ORIGIN],
    logger,
  })
}

function get(userId: string, query = ''): Request {
  return new Request(`${ENDPOINT}${query}`, { headers: { [USER_HEADER]: userId } })
}

function send(method: 'POST' | 'PATCH' | 'DELETE', userId: string, body?: unknown): Request {
  return new Request(ENDPOINT, {
    method,
    headers: { [USER_HEADER]: userId, Origin: ALLOWED_ORIGIN },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const stored = async (id: string): Promise<unknown> => (await fetch(`${baseUrl}/transactions/${id}`)).json()

const newTransaction = { type: 'deposit', amountInCents: 500, date: '2026-03-01' }

beforeAll(async () => {
  directory = mkdtempSync(join(tmpdir(), 'bytebank-bff-'))
  const database = join(directory, 'db.json')
  copyFileSync(FIXTURE, database)

  const port = await findFreePort()
  baseUrl = `http://${HOST}:${port}`
  server = spawn(process.execPath, [JSON_SERVER_BIN, database, '--host', HOST, '--port', String(port)], {
    stdio: 'ignore',
  })
  await waitUntilReady(`${baseUrl}/transactions`)
  handlers = handlersFor(baseUrl)
}, STARTUP_TIMEOUT)

afterAll(async () => {
  if (server) await stop(server)
  if (directory) rmSync(directory, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
})

describe('@bytebank/bff against a real json-server', () => {
  describe('reads', () => {
    it('lists the transactions of the user, newest first, and not those of user "10"', async () => {
      const response = await handlers.listTransactions(get('1'))

      expect(response.status).toBe(200)
      expect((await response.json()).map((transaction: { id: string }) => transaction.id)).toEqual(['b', 'a'])
    })

    it('computes the balance', async () => {
      const response = await handlers.getBalance(get('1'))

      expect(await response.json()).toEqual({ amountInCents: 10000 })
    })

    it('groups the statement by month', async () => {
      const response = await handlers.getStatement(get('1'))
      const { groups } = (await response.json()) as { groups: Array<{ monthKey: string }> }

      expect(groups.map(group => group.monthKey)).toEqual(['2026-01', '2022-11'])
    })

    it('builds the chart data', async () => {
      const response = await handlers.getChartData(get('1', '?period=all'))

      expect(await response.json()).toEqual({
        byMonth: [
          { monthKey: '2022-11', amountInCents: 15000 },
          { monthKey: '2026-01', amountInCents: 5000 },
        ],
        byType: [
          { type: 'deposit', amountInCents: 15000 },
          { type: 'payment', amountInCents: 5000 },
        ],
      })
    })
  })

  describe('writes', () => {
    it('creates, updates and deletes through the handlers', async () => {
      const created = await handlers.createTransaction(send('POST', '3', newTransaction))
      expect(created.status).toBe(201)
      const { id } = (await created.json()) as { id: string }
      expect(await stored(id)).toEqual({ ...newTransaction, id, userId: '3' })

      const updated = await handlers.updateTransaction(send('PATCH', '3', { amountInCents: 750 }), id)
      expect(updated.status).toBe(200)
      expect(await stored(id)).toEqual({ ...newTransaction, id, userId: '3', amountInCents: 750 })

      const deleted = await handlers.deleteTransaction(send('DELETE', '3'), id)
      expect(deleted.status).toBe(204)
      expect(await (await handlers.listTransactions(get('3'))).json()).toEqual([])
    })

    it('removes the attachment from the stored record with null', async () => {
      const attachment = dataUrl('image/png', 8)
      const created = await handlers.createTransaction(send('POST', '4', { ...newTransaction, attachment }))
      const { id } = (await created.json()) as { id: string }
      expect(await stored(id)).toMatchObject({ attachment })

      await handlers.updateTransaction(send('PATCH', '4', { attachment: null }), id)

      expect(await stored(id)).not.toHaveProperty('attachment')
    })
  })

  describe('isolation between users', () => {
    it('answers 404 to another user on update and keeps the record', async () => {
      const before = await stored('d')

      const response = await handlers.updateTransaction(send('PATCH', '1', { amountInCents: 1 }), 'd')

      expect(response.status).toBe(404)
      expect(await stored('d')).toEqual(before)
    })

    it('answers 404 to another user on delete and keeps the record', async () => {
      const response = await handlers.deleteTransaction(send('DELETE', '1'), 'd')

      expect(response.status).toBe(404)
      expect(await stored('d')).toMatchObject({ id: 'd' })
    })
  })

  describe('attachment at the limit', () => {
    const attachment = dataUrl('application/pdf', MAX_ATTACHMENT_BYTES)

    it('reaches json-server on POST, with the largest values in the other fields', async () => {
      const body = {
        type: 'currency_exchange',
        amountInCents: Number.MAX_SAFE_INTEGER,
        date: '2026-03-01',
        attachment,
      }

      const response = await handlers.createTransaction(send('POST', '5', body))

      expect(response.status).toBe(201)
      const { id } = (await response.json()) as { id: string }
      expect(await stored(id)).toMatchObject({ attachment })
    })

    it('reaches json-server on PATCH', async () => {
      const created = await handlers.createTransaction(send('POST', '5', newTransaction))
      const { id } = (await created.json()) as { id: string }

      const response = await handlers.updateTransaction(send('PATCH', '5', { attachment }), id)

      expect(response.status).toBe(200)
      expect(await stored(id)).toMatchObject({ attachment })
    })

    it('stays within what json-server takes, which is the reason for the limit', async () => {
      // Straight to json-server: the bff refuses this attachment before sending it
      const tooLarge = dataUrl('application/pdf', 80 * 1024)

      const response = await fetch(`${baseUrl}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newTransaction, userId: '5', attachment: tooLarge }),
      })

      expect(response.status).toBe(500)
      expect(await response.text()).toBe('Payload too large. Limit: 102400 bytes')
    })
  })

  describe('corrupted records', () => {
    function loggingHandlers() {
      const logger = { error: vi.fn() }
      return { logger, corruptible: handlersFor(baseUrl, logger) }
    }

    it.each([
      ['a value the domain rejects', '6', 'bad-value'],
      ['a field of the wrong type', '7', 'bad-shape'],
    ])('answers 502 for %s, with the id only in the log', async (_, userId, id) => {
      const { logger, corruptible } = loggingHandlers()

      const response = await corruptible.listTransactions(get(userId))

      expect(response.status).toBe(502)
      expect(await response.text()).toBe('{"error":"UPSTREAM_ERROR"}')
      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ code: 'CORRUPTED_RECORD', message: `Stored transaction is invalid: ${id}` }),
      )
    })

    it('answers 502 on update and delete, and keeps the record', async () => {
      const before = await stored('bad-value')

      const updated = await handlers.updateTransaction(send('PATCH', '6', { amountInCents: 1 }), 'bad-value')
      const deleted = await handlers.deleteTransaction(send('DELETE', '6'), 'bad-value')

      expect(updated.status).toBe(502)
      expect(deleted.status).toBe(502)
      expect(await stored('bad-value')).toEqual(before)
    })

    it('treats a record still in the legacy format the same way', async () => {
      const response = await handlers.deleteTransaction(send('DELETE', '1'), 'legacy')

      expect(response.status).toBe(502)
      expect(await stored('legacy')).toMatchObject({ id: 'legacy' })
    })

    it('keeps answering 422 for a client date that does not exist', async () => {
      const response = await handlers.createTransaction(send('POST', '8', { ...newTransaction, date: '2026-02-31' }))

      expect(response.status).toBe(422)
      expect(await response.json()).toEqual({ error: 'CALENDAR_DATE_INVALID_VALUE' })
    })

    it('keeps answering 400 for a client field that is not valid', async () => {
      const response = await handlers.createTransaction(send('POST', '8', { ...newTransaction, type: 'Depósito' }))

      expect(response.status).toBe(400)
      expect(await response.json()).toMatchObject({ error: 'VALIDATION_ERROR' })
    })
  })

  describe('backend down', () => {
    async function downBackend() {
      const logger = { error: vi.fn() }
      // Free means that nothing is listening on it
      const port = await findFreePort()
      return { logger, down: handlersFor(`http://${HOST}:${port}`, logger) }
    }

    it('answers 502 without details on a read', async () => {
      const { logger, down } = await downBackend()

      const response = await down.listTransactions(get('1'))

      expect(response.status).toBe(502)
      expect(await response.text()).toBe('{"error":"UPSTREAM_ERROR"}')
      expect(logger.error).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ code: 'UPSTREAM_UNREACHABLE' }),
      )
    })

    it('answers 502 without details on a write', async () => {
      const { down } = await downBackend()

      const response = await down.createTransaction(send('POST', '1', newTransaction))

      expect(response.status).toBe(502)
      expect(await response.text()).toBe('{"error":"UPSTREAM_ERROR"}')
    })
  })

  describe('backend that accepts the connection and never answers', () => {
    const silentServer = createServer()
    const sockets = new Set<Socket>()

    beforeAll(async () => {
      silentServer.on('connection', socket => sockets.add(socket.on('error', () => undefined)))
      await new Promise<void>(resolve => silentServer.listen(0, HOST, resolve))
    })

    afterAll(async () => {
      for (const socket of sockets) socket.destroy()
      await new Promise(resolve => silentServer.close(resolve))
    })

    function silentBackend() {
      const logger = { error: vi.fn() }
      const { port } = silentServer.address() as AddressInfo
      return { logger, silent: handlersFor(`http://${HOST}:${port}`, logger, 50) }
    }

    it('answers 502 without details on a read', async () => {
      const { logger, silent } = silentBackend()

      const response = await silent.listTransactions(get('1'))

      expect(response.status).toBe(502)
      expect(await response.text()).toBe('{"error":"UPSTREAM_ERROR"}')
      expect(logger.error).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ code: 'UPSTREAM_TIMEOUT' }))
    })

    it('answers 502 without details on a write', async () => {
      const { silent } = silentBackend()

      const response = await silent.createTransaction(send('POST', '1', newTransaction))

      expect(response.status).toBe(502)
      expect(await response.text()).toBe('{"error":"UPSTREAM_ERROR"}')
    })
  })

  it('answers 502 without details when the backend answers with an error', async () => {
    const broken = handlersFor(`${baseUrl}/missing`)

    const response = await broken.listTransactions(get('1'))

    expect(response.status).toBe(502)
    expect(await response.text()).toBe('{"error":"UPSTREAM_ERROR"}')
  })

  it('refuses a write from a strange origin before it reaches the backend', async () => {
    const before = await stored('a')
    const request = new Request(ENDPOINT, {
      method: 'DELETE',
      headers: { [USER_HEADER]: '1', Origin: 'https://evil.example' },
    })

    const response = await handlers.deleteTransaction(request, 'a')

    expect(response.status).toBe(403)
    expect(await stored('a')).toEqual(before)
  })
})
