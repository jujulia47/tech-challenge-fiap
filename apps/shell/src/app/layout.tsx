import type { Metadata } from 'next'
import { connection } from 'next/server'
import { SessionProvider } from 'next-auth/react'
import { IdleSessionGuard } from '@bytebank/design-system'
import '@fontsource/inter'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/material-icons'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Bytebank — Seu banco digital',
  description: 'Dashboard financeiro do Bytebank. Gerencie suas transações, investimentos e cartões.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Rendered per request: the nonce of the scripts only exists then
  await connection()

  return (
    <html lang="pt-BR">
      <head />
      <body>
        <SessionProvider>
          {children}
          <IdleSessionGuard />
        </SessionProvider>
      </body>
    </html>
  )
}
