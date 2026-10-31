import { connection } from 'next/server'
import '@/styles/globals.css'
import '@fontsource/inter'
import '@fontsource/material-icons'
import { SessionProvider } from 'next-auth/react'
import { IdleSessionGuard } from '@bytebank/design-system'
import { Header } from '@/components/layout/Header'
import { MenuSidebar } from '@/components/layout/MenuSidebar'
import { MenuTabs } from '@/components/layout/MenuTabs'
import { ReduxProvider } from '@/store/ReduxProvider'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Rendered per request: the nonce of the scripts only exists then
  await connection()

  return (
    <html lang="pt-BR">
      <head />
      <body>
        <SessionProvider basePath="/dashboard/api/auth">
          <ReduxProvider>
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
          </ReduxProvider>
          <IdleSessionGuard />
        </SessionProvider>
      </body>
    </html>
  )
}
