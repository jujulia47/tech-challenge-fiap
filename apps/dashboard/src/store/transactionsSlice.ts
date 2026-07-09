import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { Transaction } from '@/types/transaction'

interface TransactionsState {
  items: Transaction[]
  loading: boolean
  error: string | null
}

const initialState: TransactionsState = {
  items: [],
  loading: true,
  error: null,
}

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    setTransactions(state, action: PayloadAction<Transaction[]>) {
      state.items = action.payload
      state.loading = false
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.loading = action.payload
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload
    },
    addTransaction(state, action: PayloadAction<Transaction>) {
      state.items.push(action.payload)
    },
    updateTransaction(state, action: PayloadAction<Transaction>) {
      const index = state.items.findIndex(t => t.id === action.payload.id)
      if (index !== -1) state.items[index] = action.payload
    },
    removeTransaction(state, action: PayloadAction<string>) {
      state.items = state.items.filter(t => t.id !== action.payload)
    },
  },
})

export const {
  setTransactions,
  setLoading,
  setError,
  addTransaction,
  updateTransaction,
  removeTransaction,
} = transactionsSlice.actions

export default transactionsSlice.reducer
