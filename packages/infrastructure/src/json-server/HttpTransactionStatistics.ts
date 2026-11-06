import { TRANSACTION_TYPES, type TransactionStatistics, type TransactionSummary } from '@bytebank/core'
import { invalidList } from './statistics'
import { DEFAULT_TIMEOUT_MS, assertOk, readJson, send } from './http'

export class HttpTransactionStatistics implements TransactionStatistics {
  private readonly collectionUrl: string

  constructor(
    baseUrl: string,
    private readonly timeoutMs = DEFAULT_TIMEOUT_MS,
  ) {
    this.collectionUrl = `${baseUrl.replace(/\/+$/, '')}/transactions`
  }

  // json-server has no count: the list is read once, and only its types are kept
  async summary(): Promise<TransactionSummary> {
    const response = await send(this.collectionUrl, this.timeoutMs)
    assertOk(response, this.collectionUrl)
    const records = await readJson(response, this.collectionUrl)
    if (!Array.isArray(records)) throw invalidList(this.collectionUrl)

    const present = new Set(records.map(record => (record as { type?: unknown } | null)?.type))
    return { total: records.length, types: TRANSACTION_TYPES.filter(type => present.has(type)) }
  }
}
