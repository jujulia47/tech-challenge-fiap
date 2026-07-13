'use client'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '@/store/store'
import { addTransaction as addAction, updateTransaction as updateAction, removeTransaction } from '@/store/transactionsSlice'
import * as api from '@/lib/api/transactions'
import type { Transaction } from '@/types/transaction'

export function useTransactions() {
  const dispatch = useDispatch<AppDispatch>()
  const { items, loading } = useSelector((s: RootState) => s.transactions)

  async function addTransaction(data: Omit<Transaction, 'id'>) {
    const created = await api.createTransaction(data)
    dispatch(addAction(created))
  }

  async function editTransaction(data: Transaction) {
    const updated = await api.updateTransaction(data)
    dispatch(updateAction(updated))
  }

  async function deleteTransaction(id: string) {
    await api.deleteTransaction(id)
    dispatch(removeTransaction(id))
  }

  return { transactions: items, loading, addTransaction, editTransaction, deleteTransaction }
}
