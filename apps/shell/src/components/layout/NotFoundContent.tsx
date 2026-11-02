'use client'

import { usePathname } from 'next/navigation'
import { Header, NotFoundMessage } from '@bytebank/design-system'
import { NAV_ITEMS } from '@/components/layout/nav-items'
import { Footer } from '@/components/layout/Footer'
import { PublicShell } from '@/components/layout/PublicShell'

export function NotFoundContent() {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard') ?? false

  const content = isDashboard
    ? <NotFoundMessage homeHref="/dashboard" homeLabel="Voltar ao dashboard" external />
    : <NotFoundMessage homeHref="/" homeLabel="Voltar ao início" />

  if (isDashboard) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col">
        <Header navItems={NAV_ITEMS} />
        {content}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-bg-base flex flex-col">
      <PublicShell>
        {content}
        <Footer />
      </PublicShell>
    </div>
  )
}
