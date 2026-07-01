'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function NotFound() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-16 text-center">

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

      {/* CTA — href "/" resolves to /dashboard via the zone basePath */}
      <Link href="/">
        <Button
          variant="primary"
          label="Voltar ao dashboard"
        />
      </Link>

    </div>
  )
}
