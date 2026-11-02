import type { Metadata } from 'next'
import { connection } from 'next/server'
import { SessionProvider } from 'next-auth/react'
import { IdleSessionGuard } from '@bytebank/design-system'
import { iconFont } from '@bytebank/design-system/iconFont'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@bytebank/design-system/theme.css'

export const metadata: Metadata = {
  title: { default: 'Bytebank — Seu banco digital', template: '%s | Bytebank' },
  description: 'Abra sua conta no Bytebank e cuide do seu dinheiro com mais liberdade, segurança e sem tarifas de manutenção.',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Rendered per request: the nonce of the scripts only exists then
  await connection()

  return (
    <html lang="pt-BR" className={iconFont.variable}>
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
