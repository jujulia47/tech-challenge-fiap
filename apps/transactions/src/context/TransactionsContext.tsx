'use client'

import { createContext, useContext } from 'react'
import type { Transaction } from '@/types/transaction'

interface TransactionsContextValue {
  transactions: Transaction[]
  loading: boolean
  addTransaction: (data: Omit<Transaction, 'id'>) => Promise<void>
  editTransaction: (data: Transaction) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
}

export const TransactionsContext = createContext<TransactionsContextValue | null>(null)

export function useTransactions() {
  const ctx = useContext(TransactionsContext)
  if (!ctx) throw new Error('useTransactions must be used inside TransactionsProvider')
  return ctx
}
