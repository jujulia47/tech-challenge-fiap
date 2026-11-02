'use client'

import { createTransactionsApi, createTransactionsProvider } from '@bytebank/store'

const transactionsApi = createTransactionsApi('/transactions')

export const { useGetTransactionsQuery, useUpdateTransactionMutation, useDeleteTransactionMutation } = transactionsApi

export const ReduxProvider = createTransactionsProvider(transactionsApi)
