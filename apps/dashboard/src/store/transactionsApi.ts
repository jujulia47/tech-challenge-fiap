'use client'

import { createTransactionsApi, createTransactionsProvider } from '@bytebank/store'

const transactionsApi = createTransactionsApi('/dashboard')

export const {
  useGetBalanceQuery,
  useGetStatementQuery,
  useGetChartDataQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
  usePrefetch,
  useUpdateProfileMutation,
  useChangePasswordMutation,
} = transactionsApi

export const ReduxProvider = createTransactionsProvider(transactionsApi)
