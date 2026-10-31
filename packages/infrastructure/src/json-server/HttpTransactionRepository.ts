import { ApplicationError, type Transaction, type TransactionRepository } from '@bytebank/core'
import { InfrastructureError } from '../errors/InfrastructureError'
import { recordFromPrimitives, transactionFromRecord } from './transactionRecordMapper'

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const DEFAULT_TIMEOUT_MS = 5_000

interface HttpTransactionRepositoryOptions {
  timeoutMs?: number
}

function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError'
}

function timeoutError(url: string, cause: unknown): InfrastructureError {
  return new InfrastructureError(`The backend did not answer in time: ${url}`, {
    code: 'UPSTREAM_TIMEOUT',
    url,
    cause,
  })
}

function assertOk(response: Response, url: string): void {
  if (!response.ok) {
    throw new InfrastructureError(`Request failed with status ${response.status}: ${url}`, {
      code: 'UPSTREAM_BAD_STATUS',
      status: response.status,
      url,
    })
  }
}

async function readJson(response: Response, url: string): Promise<unknown> {
  try {
    return await response.json()
  } catch (error) {
    // The signal of the request also covers the body, which may stop halfway
    if (isTimeout(error)) throw timeoutError(url, error)
    // No cause: the message of a JSON parse error quotes the start of the response body
    throw new InfrastructureError(`Expected a JSON response: ${url}`, { code: 'UPSTREAM_INVALID_RESPONSE', url })
  }
}

export class HttpTransactionRepository implements TransactionRepository {
  private readonly collectionUrl: string
  private readonly timeoutMs: number

  constructor(baseUrl: string, { timeoutMs = DEFAULT_TIMEOUT_MS }: HttpTransactionRepositoryOptions = {}) {
    this.collectionUrl = `${baseUrl.replace(/\/+$/, '')}/transactions`
    this.timeoutMs = timeoutMs
  }

  async findAllByUser(userId: string): Promise<Transaction[]> {
    // `?userId=1` does not work: json-server coerces it to the number 1 and compares
    // strictly with the stored string. `_where` keeps the value as a string.
    const where = encodeURIComponent(JSON.stringify({ userId: { eq: userId } }))
    const url = `${this.collectionUrl}?_where=${where}`
    const response = await this.send(url)
    assertOk(response, url)

    const records = await readJson(response, url)
    if (!Array.isArray(records)) {
      throw new InfrastructureError(`Expected a list of transactions: ${url}`, {
        code: 'UPSTREAM_INVALID_RESPONSE',
        url,
      })
    }
    // Ownership is checked here too: isolation must not depend on the server's filter
    return records.map(transactionFromRecord).filter(transaction => transaction.userId === userId)
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const url = this.itemUrl(id)
    const response = await this.send(url)
    if (response.status === 404) return null
    assertOk(response, url)

    const transaction = transactionFromRecord(await readJson(response, url))
    return transaction.userId === userId ? transaction : null
  }

  async create(transaction: Transaction): Promise<Transaction> {
    const response = await this.send(this.collectionUrl, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(recordFromPrimitives(transaction.toPrimitives())),
    })
    assertOk(response, this.collectionUrl)
    // json-server replaces the id on POST, so the response is the source of truth
    return transactionFromRecord(await readJson(response, this.collectionUrl))
  }

  async update(transaction: Transaction): Promise<void> {
    await this.assertOwned(transaction.id, transaction.userId)
    const url = this.itemUrl(transaction.id)
    const response = await this.send(url, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(recordFromPrimitives(transaction.toPrimitives())),
    })
    assertOk(response, url)
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.assertOwned(id, userId)
    const url = this.itemUrl(id)
    const response = await this.send(url, { method: 'DELETE' })
    assertOk(response, url)
  }

  private itemUrl(id: string): string {
    return `${this.collectionUrl}/${encodeURIComponent(id)}`
  }

  // fetch rejects when no response arrives: backend down, DNS failure, connection reset, timeout
  private async send(url: string, init: RequestInit = {}): Promise<Response> {
    try {
      return await fetch(url, { ...init, signal: AbortSignal.timeout(this.timeoutMs) })
    } catch (error) {
      if (isTimeout(error)) throw timeoutError(url, error)
      throw new InfrastructureError(`Could not reach the backend: ${url}`, {
        code: 'UPSTREAM_UNREACHABLE',
        url,
        cause: error,
      })
    }
  }

  private async assertOwned(id: string, userId: string): Promise<void> {
    if (!(await this.findById(id, userId))) {
      throw new ApplicationError('TRANSACTION_NOT_FOUND', `Transaction not found: ${id}`)
    }
  }
}
