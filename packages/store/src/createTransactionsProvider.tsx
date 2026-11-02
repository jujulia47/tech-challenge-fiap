'use client'

import { useState, type ReactNode } from 'react'
import { Provider } from 'react-redux'
import type { TransactionsApi } from './createTransactionsApi'
import { createTransactionsStore } from './createTransactionsStore'

interface TransactionsProviderProps {
  children: ReactNode
}

// The provider of a zone, bound to its API. A layout cannot pass the API itself, because
// a Server Component only hands plain data to a Client Component.
export function createTransactionsProvider(api: TransactionsApi) {
  return function TransactionsProvider({ children }: TransactionsProviderProps) {
    const [store] = useState(() => createTransactionsStore(api))
    return <Provider store={store}>{children}</Provider>
  }
}
