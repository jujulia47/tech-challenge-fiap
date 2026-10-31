import type {
  BalanceDTO,
  ChartDataDTO,
  PeriodInMonths,
  StatementDTO,
  TransactionDTO,
  TransactionType,
} from '@bytebank/core'

// Runs in the browser: type imports only, so nothing from the server reaches the bundle

const JSON_HEADERS = { 'Content-Type': 'application/json' }
const UNKNOWN_ERROR = 'UNKNOWN_ERROR'

export type NewTransaction = Pick<TransactionDTO, 'type' | 'amountInCents' | 'date' | 'attachment'>
export type TransactionChanges = Pick<TransactionDTO, 'type' | 'amountInCents'>

export interface ChartDataFilters {
  period: PeriodInMonths
  type?: TransactionType
}

export interface TransactionsClient {
  fetchTransactions(): Promise<TransactionDTO[]>
  createTransaction(data: NewTransaction): Promise<TransactionDTO>
  updateTransaction(id: string, changes: TransactionChanges): Promise<TransactionDTO>
  deleteTransaction(id: string): Promise<void>
  fetchBalance(): Promise<BalanceDTO>
  fetchStatement(): Promise<StatementDTO>
  fetchChartData(filters: ChartDataFilters): Promise<ChartDataDTO>
}

export class TransactionsApiError extends Error {
  readonly code: string

  constructor(code: string) {
    super(code)
    this.name = 'TransactionsApiError'
    this.code = code
  }
}

async function errorCode(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: string }
    return body.error ?? UNKNOWN_ERROR
  } catch {
    return UNKNOWN_ERROR
  }
}

async function request(url: string, init?: RequestInit): Promise<Response> {
  const response = await fetch(url, init)
  // Expired session: the login is at the root of the shell, which is a full page load away
  if (response.status === 401) window.location.href = '/'
  if (!response.ok) throw new TransactionsApiError(await errorCode(response))
  return response
}

async function getJson<T>(url: string): Promise<T> {
  const response = await request(url)
  return response.json()
}

async function sendJson<T>(method: 'POST' | 'PATCH', url: string, body: unknown): Promise<T> {
  const response = await request(url, { method, headers: JSON_HEADERS, body: JSON.stringify(body) })
  return response.json()
}

// basePath is the one of the zone, such as /transactions. The URLs are relative because the
// browser is on the origin of the shell, whose rewrite reaches the zone. Next.js does not add
// the basePath to fetch, so it has to be part of them.
export function createTransactionsClient(basePath: string): TransactionsClient {
  const apiUrl = `${basePath}/api`
  const transactionsUrl = `${apiUrl}/transactions`
  const transactionUrl = (id: string) => `${transactionsUrl}/${encodeURIComponent(id)}`

  return {
    fetchTransactions: () => getJson(transactionsUrl),
    createTransaction: data => sendJson('POST', transactionsUrl, data),
    updateTransaction: (id, changes) => sendJson('PATCH', transactionUrl(id), changes),
    deleteTransaction: async id => {
      await request(transactionUrl(id), { method: 'DELETE' })
    },
    fetchBalance: () => getJson(`${apiUrl}/balance`),
    fetchStatement: () => getJson(`${apiUrl}/statement`),
    fetchChartData: ({ period, type }) => {
      const query = new URLSearchParams({ period: String(period) })
      if (type !== undefined) query.set('type', type)
      return getJson(`${apiUrl}/chart-data?${query}`)
    },
  }
}
