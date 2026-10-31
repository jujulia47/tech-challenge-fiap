import type { Transaction, TransactionRepository } from '@bytebank/core'
import { FixedClock, InMemoryTransactionRepository, SequentialIdGenerator } from '@bytebank/core/testing'
import { createUseCases, type UseCases } from '../composition/createUseCases'
import {
  createTransactionHandlers,
  type Logger,
  type TransactionHandlers,
} from '../http/createTransactionHandlers'

const ENDPOINT = 'http://bff.test/transactions'

export const ALLOWED_ORIGIN = 'http://bff.test'
export const TODAY = '2026-03-15'

export const validBody = { type: 'deposit', amountInCents: 15000, date: '2026-03-01' }

type RequestHeaders = Record<string, string>

interface HarnessOptions {
  transactions?: readonly Transaction[]
  repository?: TransactionRepository
  userId?: string | null
  logger?: Logger
}

export interface Harness {
  handlers: TransactionHandlers
  useCases: UseCases
}

export function setup({
  transactions = [],
  repository = new InMemoryTransactionRepository(transactions),
  userId = 'user-a',
  logger,
}: HarnessOptions = {}): Harness {
  const useCases = createUseCases({
    repository,
    clock: new FixedClock(TODAY),
    idGenerator: new SequentialIdGenerator(),
  })
  const handlers = createTransactionHandlers({
    getUserId: async () => userId,
    useCases,
    allowedOrigins: [ALLOWED_ORIGIN],
    logger,
  })
  return { handlers, useCases }
}

export function getRequest(query = ''): Request {
  return new Request(`${ENDPOINT}${query}`)
}

export function deleteRequest(headers: RequestHeaders = { Origin: ALLOWED_ORIGIN }): Request {
  return new Request(ENDPOINT, { method: 'DELETE', headers })
}

export function rawRequest(method: 'POST' | 'PATCH', body: string, headers: RequestHeaders = {}): Request {
  return new Request(ENDPOINT, { method, body, headers: { Origin: ALLOWED_ORIGIN, ...headers } })
}

export function jsonRequest(method: 'POST' | 'PATCH', value: unknown, headers: RequestHeaders = {}): Request {
  return rawRequest(method, JSON.stringify(value), headers)
}

// A chunked request: the body arrives in parts and there is no Content-Length
export function streamRequest(method: 'POST' | 'PATCH', chunks: readonly Uint8Array[]): Request {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk)
      controller.close()
    },
  })
  const init: RequestInit & { duplex: 'half' } = {
    method,
    body: stream,
    duplex: 'half',
    headers: { Origin: ALLOWED_ORIGIN },
  }
  return new Request(ENDPOINT, init)
}

export function dataUrl(mimeType: string, bytes: number): string {
  return `data:${mimeType};base64,${Buffer.alloc(bytes, 1).toString('base64')}`
}
