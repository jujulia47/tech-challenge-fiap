'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { PublicShell } from '@/components/layout/PublicShell'

export default function NotFound() {
  const pathname = usePathname()
  const isDashboard = pathname?.startsWith('/dashboard') ?? false

  const content = (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-16 text-center">

      {/* Animated 404 — style fontSize: exception, no DS token for 80px/96px */}
      <div className="flex flex-col items-center gap-4">
        <span
          className="material-icons text-primary-900 animate-float"
          style={{ fontSize: 80 }}
        >
          search_off
        </span>
        <p
          className="font-bold text-primary-900 animate-float"
          style={{ fontSize: 96, lineHeight: 1, animationDelay: '0.2s' }}
        >
          404
        </p>
      </div>

      {/* Message */}
      <div className="flex flex-col gap-2 max-w-sm">
        <h1 className="text-heading font-bold text-text-primary">
          Página não encontrada
        </h1>
        <p className="text-body text-text-secondary">
          A página que você está procurando não existe ou foi movida.
        </p>
      </div>

      {/* CTA */}
      <Link href={isDashboard ? '/dashboard' : '/'}>
        <Button
          variant="primary"
          label={isDashboard ? 'Voltar ao dashboard' : 'Voltar ao início'}
        />
      </Link>

    </main>
  )

  if (isDashboard) {
    return (
      <div className="min-h-screen bg-bg-base flex flex-col">
        <Header />
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
