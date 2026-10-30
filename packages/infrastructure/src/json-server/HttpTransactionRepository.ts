import { ApplicationError, type Transaction, type TransactionRepository } from '@bytebank/core'
import { InfrastructureError } from '../errors/InfrastructureError'
import { recordFromPrimitives, transactionFromRecord } from './transactionRecordMapper'

const JSON_HEADERS = { 'Content-Type': 'application/json' }

function assertOk(response: Response, url: string): void {
  if (!response.ok) {
    throw new InfrastructureError(`Request failed with status ${response.status}: ${url}`, {
      status: response.status,
      url,
    })
  }
}

export class HttpTransactionRepository implements TransactionRepository {
  private readonly collectionUrl: string

  constructor(baseUrl: string) {
    this.collectionUrl = `${baseUrl.replace(/\/+$/, '')}/transactions`
  }

  async findAllByUser(userId: string): Promise<Transaction[]> {
    // `?userId=1` does not work: json-server coerces it to the number 1 and compares
    // strictly with the stored string. `_where` keeps the value as a string.
    const where = encodeURIComponent(JSON.stringify({ userId: { eq: userId } }))
    const url = `${this.collectionUrl}?_where=${where}`
    const response = await fetch(url)
    assertOk(response, url)

    const records: unknown = await response.json()
    if (!Array.isArray(records)) {
      throw new InfrastructureError(`Expected a list of transactions: ${url}`, { url })
    }
    // Ownership is checked here too: isolation must not depend on the server's filter
    return records.map(transactionFromRecord).filter(transaction => transaction.userId === userId)
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const url = this.itemUrl(id)
    const response = await fetch(url)
    if (response.status === 404) return null
    assertOk(response, url)

    const transaction = transactionFromRecord(await response.json())
    return transaction.userId === userId ? transaction : null
  }

  async create(transaction: Transaction): Promise<Transaction> {
    const response = await fetch(this.collectionUrl, {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify(recordFromPrimitives(transaction.toPrimitives())),
    })
    assertOk(response, this.collectionUrl)
    // json-server replaces the id on POST, so the response is the source of truth
    return transactionFromRecord(await response.json())
  }

  async update(transaction: Transaction): Promise<void> {
    await this.assertOwned(transaction.id, transaction.userId)
    const url = this.itemUrl(transaction.id)
    const response = await fetch(url, {
      method: 'PUT',
      headers: JSON_HEADERS,
      body: JSON.stringify(recordFromPrimitives(transaction.toPrimitives())),
    })
    assertOk(response, url)
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.assertOwned(id, userId)
    const url = this.itemUrl(id)
    const response = await fetch(url, { method: 'DELETE' })
    assertOk(response, url)
  }

  private itemUrl(id: string): string {
    return `${this.collectionUrl}/${encodeURIComponent(id)}`
  }

  private async assertOwned(id: string, userId: string): Promise<void> {
    if (!(await this.findById(id, userId))) {
      throw new ApplicationError('TRANSACTION_NOT_FOUND', `Transaction not found: ${id}`)
    }
  }
}
