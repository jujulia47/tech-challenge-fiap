import { ApplicationError, type Transaction, type TransactionRepository } from '@bytebank/core'
import { InfrastructureError } from '../errors/InfrastructureError'
import { DEFAULT_TIMEOUT_MS, JSON_HEADERS, assertOk, readJson, send } from './http'
import { recordFromPrimitives, transactionFromRecord } from './transactionRecordMapper'

interface HttpTransactionRepositoryOptions {
  timeoutMs?: number
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
    // The user id is in the query: errors name the collection only, because they reach the log
    const safeUrl = this.collectionUrl
    const response = await send(`${safeUrl}?_where=${where}`, this.timeoutMs, {}, safeUrl)
    assertOk(response, safeUrl)

    const records = await readJson(response, safeUrl)
    if (!Array.isArray(records)) {
      throw new InfrastructureError(`Expected a list of transactions: ${safeUrl}`, {
        code: 'UPSTREAM_INVALID_RESPONSE',
        url: safeUrl,
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

  private send(url: string, init?: RequestInit): Promise<Response> {
    return send(url, this.timeoutMs, init)
  }

  private async assertOwned(id: string, userId: string): Promise<void> {
    if (!(await this.findById(id, userId))) {
      throw new ApplicationError('TRANSACTION_NOT_FOUND', `Transaction not found: ${id}`)
    }
  }
}
