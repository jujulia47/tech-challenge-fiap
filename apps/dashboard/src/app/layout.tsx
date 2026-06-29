'use client'

import '@/styles/globals.css'
import '@fontsource/inter'
import '@fontsource/material-icons-outlined'
import { useState, useEffect, useCallback } from 'react'
import { SessionProvider } from 'next-auth/react'
import { Header } from '@/components/layout/Header'
import { MenuSidebar } from '@/components/layout/MenuSidebar'
import { MenuTabs } from '@/components/layout/MenuTabs'
import { TransactionsContext } from '@/context/TransactionsContext'
import * as api from '@/lib/api/transactions'
import type { Transaction } from '@/types/transaction'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.fetchTransactions()
      .then(setTransactions)
      .finally(() => setLoading(false))
  }, [])

  const addTransaction = useCallback(async (data: Omit<Transaction, 'id'>) => {
    const created = await api.createTransaction(data)
    setTransactions(prev => [...prev, created])
  }, [])

  const editTransaction = useCallback(async (data: Transaction) => {
    const updated = await api.updateTransaction(data)
    setTransactions(prev => prev.map(tx => tx.id === updated.id ? updated : tx))
  }, [])

  const deleteTransaction = useCallback(async (id: string) => {
    await api.deleteTransaction(id)
    setTransactions(prev => prev.filter(tx => tx.id !== id))
  }, [])

  return (
    <html lang="pt-BR">
      <body>
        <SessionProvider>
          <TransactionsContext.Provider
            value={{ transactions, loading, addTransaction, editTransaction, deleteTransaction }}
          >
            <div className="min-h-screen bg-bg-base flex flex-col">
              <Header />
              <MenuTabs />
              <div className="flex-1">
                <div className="max-w-[1200px] mx-auto px-6 py-6 flex gap-6">
                  <MenuSidebar />
                  <main className="flex-1 min-w-0">{children}</main>
                </div>
              </div>
            </div>
          </TransactionsContext.Provider>
        </SessionProvider>
      </body>
    </html>
  )
}
