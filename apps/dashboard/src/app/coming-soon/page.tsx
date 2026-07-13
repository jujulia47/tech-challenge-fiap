import Link from 'next/link'
import { Button } from '@/components/ui/Button'

export default function ComingSoonPage() {
  return (
    <div className="flex flex-col gap-8 min-h-[calc(100vh-96px)] justify-center">

      {/* Main content — centered */}
      <div className="flex flex-col items-center justify-center gap-6 text-center">
        {/* style fontSize: exception — no text-icon-xl token in DS */}
        <span className="material-icons text-text-secondary animate-float" style={{ fontSize: 64 }}>
          rocket_launch
        </span>
        <div className="flex flex-col gap-2">
          <h1 className="text-heading font-bold text-text-primary">
            Em breve
          </h1>
          <p className="text-body text-text-secondary max-w-sm">
            Estamos trabalhando nessa funcionalidade.
            Em breve ela estará disponível para você.
          </p>
        </div>
        <Link href="/">
          <Button variant="primary" label="Voltar ao início" />
        </Link>
      </div>

      {/* Suggestions card */}
      <div className="bg-surface-card rounded-md p-6 flex flex-col gap-4 max-w-lg mx-auto w-full">
        <p className="text-body-semibold text-text-primary">
          Enquanto isso, que tal explorar:
        </p>
        <div className="flex flex-col gap-2">
          {([
            { label: 'Ver meu extrato completo', href: '/transactions', icon: 'receipt_long', external: true },
            { label: 'Meus investimentos',        href: '/investments', icon: 'trending_up'    },
            { label: 'Meus cartões',              href: '/cards',       icon: 'credit_card'    },
            { label: 'Outros serviços',           href: '/services',    icon: 'grid_view'      },
          ] as { label: string; href: string; icon: string; external?: boolean }[]).map((item) => {
            const itemClassName = 'flex items-center gap-3 p-3 rounded-md hover:bg-bg-base transition-colors'
            const content = (
              <>
                <span className="material-icons text-success text-icon-sm">{item.icon}</span>
                <span className="text-body text-text-primary">{item.label}</span>
                <span className="material-icons text-text-secondary text-icon-sm ml-auto">chevron_right</span>
              </>
            )
            return item.external ? (
              <a key={item.href} href={item.href} className={itemClassName}>
                {content}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className={itemClassName}>
                {content}
              </Link>
            )
          })}
        </div>
      </div>

    </div>
  )
}
