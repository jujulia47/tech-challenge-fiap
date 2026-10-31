import { createServer as createHttpServer, type Server as HttpServer } from 'node:http'
import { createServer as createTcpServer, type AddressInfo, type Server, type Socket } from 'node:net'
import { Transaction } from '@bytebank/core'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { HttpTransactionRepository } from './HttpTransactionRepository'

// Real servers, because the behavior under test is what fetch does when an answer never comes
const HOST = '127.0.0.1'
const TIMEOUT_MS = 50

const record = { id: '1', userId: 'user-a', type: 'deposit', amountInCents: 15000, date: '2022-11-18' }
const transaction = Transaction.fromPrimitives(record)
const timedOut = { name: 'InfrastructureError', code: 'UPSTREAM_TIMEOUT' }

const sockets = new Set<Socket>()

function track(server: Server | HttpServer): void {
  server.on('connection', (socket: Socket) => {
    sockets.add(socket)
    socket.on('error', () => undefined)
    socket.on('close', () => sockets.delete(socket))
  })
}

async function listen(server: Server | HttpServer): Promise<string> {
  track(server)
  await new Promise<void>(resolve => server.listen(0, HOST, resolve))
  return `http://${HOST}:${(server.address() as AddressInfo).port}`
}

function close(server: Server | HttpServer): Promise<void> {
  return new Promise(resolve => server.close(() => resolve()))
}

// Accepts the connection and never writes a byte
const silentServer = createTcpServer()
// Sends the status and half of the body, then stops
const stalledBodyServer = createHttpServer((_, response) => {
  response.writeHead(200, { 'Content-Type': 'application/json' })
  response.write('{"id":"1",')
})
// Confirms the owner on GET and never answers the write
const stalledWriteServer = createHttpServer((request, response) => {
  if (request.method === 'GET') response.end(JSON.stringify(record))
})

const repositoryFor = (baseUrl: string) => new HttpTransactionRepository(baseUrl, { timeoutMs: TIMEOUT_MS })

let silent: HttpTransactionRepository
let stalledBody: HttpTransactionRepository
let stalledWrite: HttpTransactionRepository

beforeAll(async () => {
  silent = repositoryFor(await listen(silentServer))
  stalledBody = repositoryFor(await listen(stalledBodyServer))
  stalledWrite = repositoryFor(await listen(stalledWriteServer))
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(async () => {
  for (const socket of sockets) socket.destroy()
  await Promise.all([close(silentServer), close(stalledBodyServer), close(stalledWriteServer)])
})

describe('HttpTransactionRepository timeout', () => {
  describe('a server that accepts the connection and never answers', () => {
    it.each([
      ['findAllByUser', () => silent.findAllByUser('user-a')],
      ['findById', () => silent.findById('1', 'user-a')],
      ['create', () => silent.create(transaction)],
      ['update', () => silent.update(transaction)],
      ['delete', () => silent.delete('1', 'user-a')],
    ])('%s reports a timeout', async (_, call) => {
      await expect(call()).rejects.toMatchObject(timedOut)
    })

    it('names the url and keeps the cause', async () => {
      const error = (await silent.findById('1', 'user-a').catch((e: unknown) => e)) as Error & { url: string }

      expect(error.url).toMatch(/\/transactions\/1$/)
      expect(error.message).toContain('The backend did not answer in time')
      expect(error.cause).toMatchObject({ name: 'TimeoutError' })
    })
  })

  describe('a server that stops in the middle of the body', () => {
    it.each([
      ['findAllByUser', () => stalledBody.findAllByUser('user-a')],
      ['findById', () => stalledBody.findById('1', 'user-a')],
      ['create', () => stalledBody.create(transaction)],
    ])('%s reports a timeout, not an invalid response', async (_, call) => {
      await expect(call()).rejects.toMatchObject(timedOut)
    })
  })

  describe('a server that only stops on the write', () => {
    it.each([
      ['update', () => stalledWrite.update(transaction)],
      ['delete', () => stalledWrite.delete('1', 'user-a')],
    ])('%s reports a timeout after the owner check', async (_, call) => {
      await expect(call()).rejects.toMatchObject(timedOut)
    })
  })

  describe('the configured value', () => {
    const readSilent = async (baseUrl: string, options?: { timeoutMs: number }) => {
      const realTimeout = AbortSignal.timeout.bind(AbortSignal)
      const timeout = vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => realTimeout(TIMEOUT_MS))

      await new HttpTransactionRepository(baseUrl, options).findById('1', 'user-a').catch(() => undefined)

      return timeout
    }

    it('is 5 s by default', async () => {
      const baseUrl = `http://${HOST}:${(silentServer.address() as AddressInfo).port}`

      expect(await readSilent(baseUrl)).toHaveBeenCalledExactlyOnceWith(5_000)
    })

    it('comes from the constructor', async () => {
      const baseUrl = `http://${HOST}:${(silentServer.address() as AddressInfo).port}`

      expect(await readSilent(baseUrl, { timeoutMs: 1_234 })).toHaveBeenCalledExactlyOnceWith(1_234)
    })
  })
})
