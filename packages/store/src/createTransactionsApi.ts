import { createApi, fakeBaseQuery } from '@reduxjs/toolkit/query/react'
import {
  TransactionsApiError,
  createTransactionsClient,
  type ChartDataFilters,
  type NewTransaction,
  type TransactionChanges,
} from '@bytebank/bff/client'
import type { BalanceDTO, ChartDataDTO, StatementDTO, TransactionDTO } from '@bytebank/core'

interface TransactionsApiFailure {
  code: string
}

interface UpdateTransactionArgs {
  id: string
  changes: TransactionChanges
}

type Result<T> = { data: T; error?: undefined } | { error: TransactionsApiFailure; data?: undefined }

// Everything derived from the transactions. The server computes all of it, so after a write
// the screens ask again instead of updating a local copy.
const TAGS = ['Transactions', 'Balance', 'Statement', 'ChartData'] as const

// Redux keeps plain objects only, so the error is reduced to its code
async function toResult<T>(call: () => Promise<T>): Promise<Result<T>> {
  try {
    return { data: await call() }
  } catch (error) {
    return { error: { code: error instanceof TransactionsApiError ? error.code : 'NETWORK_ERROR' } }
  }
}

// One API per zone, because each zone reaches the BFF through its own basePath.
// An array of tags also invalidates after a failure, which is what a write needs here:
// after a timeout, the server may have applied it anyway.
export function createTransactionsApi(basePath: string) {
  const client = createTransactionsClient(basePath)

  return createApi({
    reducerPath: 'transactionsApi',
    baseQuery: fakeBaseQuery<TransactionsApiFailure>(),
    tagTypes: TAGS,
    endpoints: builder => ({
      getTransactions: builder.query<TransactionDTO[], void>({
        queryFn: () => toResult(client.fetchTransactions),
        providesTags: ['Transactions'],
      }),
      getBalance: builder.query<BalanceDTO, void>({
        queryFn: () => toResult(client.fetchBalance),
        providesTags: ['Balance'],
      }),
      getStatement: builder.query<StatementDTO, void>({
        queryFn: () => toResult(client.fetchStatement),
        providesTags: ['Statement'],
      }),
      getChartData: builder.query<ChartDataDTO, ChartDataFilters>({
        queryFn: filters => toResult(() => client.fetchChartData(filters)),
        providesTags: ['ChartData'],
      }),
      createTransaction: builder.mutation<TransactionDTO, NewTransaction>({
        queryFn: data => toResult(() => client.createTransaction(data)),
        invalidatesTags: [...TAGS],
      }),
      updateTransaction: builder.mutation<TransactionDTO, UpdateTransactionArgs>({
        queryFn: ({ id, changes }) => toResult(() => client.updateTransaction(id, changes)),
        invalidatesTags: [...TAGS],
      }),
      deleteTransaction: builder.mutation<null, string>({
        queryFn: id => toResult<null>(() => client.deleteTransaction(id).then(() => null)),
        invalidatesTags: [...TAGS],
      }),
    }),
  })
}

export type TransactionsApi = ReturnType<typeof createTransactionsApi>
