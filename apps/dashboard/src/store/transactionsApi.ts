import { createTransactionsApi } from '@bytebank/store'

export const transactionsApi = createTransactionsApi('/dashboard')

export const {
  useGetBalanceQuery,
  useGetStatementQuery,
  useGetChartDataQuery,
  useCreateTransactionMutation,
  useUpdateTransactionMutation,
  useDeleteTransactionMutation,
} = transactionsApi
