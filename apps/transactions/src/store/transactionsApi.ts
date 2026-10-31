import { createTransactionsApi } from '@bytebank/store'

export const transactionsApi = createTransactionsApi('/transactions')

export const { useGetTransactionsQuery, useUpdateTransactionMutation, useDeleteTransactionMutation } = transactionsApi
