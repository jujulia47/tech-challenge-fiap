'use client'
import '@/styles/globals.css'
import '@fontsource/inter'
import '@fontsource/material-icons'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { SessionProvider } from 'next-auth/react'
import { Header } from '@/components/layout/Header'
import { MenuSidebar } from '@/components/layout/MenuSidebar'
import { MenuTabs } from '@/components/layout/MenuTabs'
import { ReduxProvider } from '@/store/ReduxProvider'
import { setTransactions, setLoading, setError } from '@/store/transactionsSlice'
import * as api from '@/lib/api/transactions'

function TransactionsLoader({ children }: { children: React.ReactNode }) {
  const dispatch = useDispatch()

  useEffect(() => {
    dispatch(setLoading(true))
    api.fetchTransactions()
      .then(data => dispatch(setTransactions(data)))
      .catch(() => dispatch(setError('Erro ao carregar transações')))
  }, [dispatch])

  return (
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
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head />
      <body>
        <SessionProvider basePath="/dashboard/api/auth">
          <ReduxProvider>
            <TransactionsLoader>{children}</TransactionsLoader>
          </ReduxProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
