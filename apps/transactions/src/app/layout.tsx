import type { Metadata } from 'next'
import { connection } from 'next/server'
import '@bytebank/design-system/theme.css'
import { ZoneSessionProvider } from '@bytebank/auth/sessionProvider'
import { Header, IdleSessionGuard, MenuSidebar, MenuTabs, SHELL_ICONS } from '@bytebank/design-system'
import { iconFont } from '@bytebank/design-system/iconFont'
import { NAV_ITEMS, PROFILE_ITEMS } from '@/components/layout/nav-items'
import { ReduxProvider } from '@/store/transactionsApi'

export const metadata: Metadata = {
  title: { default: 'Extrato | Bytebank', template: '%s | Bytebank' },
  description: 'Busque, filtre e consulte todas as suas transações no Bytebank.',
  icons: SHELL_ICONS,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Rendered per request: the nonce of the scripts only exists then
  await connection()

  return (
    <html lang="pt-BR" className={iconFont.variable}>
      <head />
      <body>
        <ZoneSessionProvider basePath="/transactions/api/auth">
          <ReduxProvider>
            <div className="min-h-screen bg-bg-base flex flex-col">
              <Header navItems={NAV_ITEMS} profileItems={PROFILE_ITEMS} />
              <MenuTabs items={NAV_ITEMS} />
              <div className="flex-1">
                <div className="max-w-[1200px] mx-auto px-6 py-6 flex gap-6">
                  <MenuSidebar items={NAV_ITEMS} />
                  <main className="flex-1 min-w-0">{children}</main>
                </div>
              </div>
            </div>
          </ReduxProvider>
          <IdleSessionGuard />
        </ZoneSessionProvider>
      </body>
    </html>
  )
}
