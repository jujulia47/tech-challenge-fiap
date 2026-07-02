import type { Metadata } from 'next'
import { SessionProvider } from 'next-auth/react'
import '@fontsource/inter'
import '@fontsource/inter/400.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: 'Bytebank — Seu banco digital',
  description: 'Dashboard financeiro do Bytebank. Gerencie suas transações, investimentos e cartões.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link
          href="https://fonts.googleapis.com/icon?family=Material+Icons"
          rel="stylesheet"
        />
      </head>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  )
}
