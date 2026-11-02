import Link from 'next/link'

interface NotFoundMessageProps {
  homeHref: string
  homeLabel: string
  // The home is in another zone, so it needs a full page load
  external?: boolean
}

const HOME_LINK_CLASSES = 'inline-flex items-center h-12 px-6 rounded-md border text-body-semibold bg-primary-900 text-inverse border-primary-900 hover:opacity-90 transition-all'

export function NotFoundMessage({ homeHref, homeLabel, external = false }: NotFoundMessageProps) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center gap-8 px-6 py-16 text-center">
      <div className="flex flex-col items-center gap-4">
        <span className="material-icons text-primary-900 animate-float text-[80px]!" aria-hidden="true">
          search_off
        </span>
        <p className="font-bold text-primary-900 animate-float text-[96px]! leading-none [animation-delay:0.2s]">
          404
        </p>
      </div>

      <div className="flex flex-col gap-2 max-w-sm">
        <h1 className="text-heading font-bold text-text-primary">
          Página não encontrada
        </h1>
        <p className="text-body text-text-secondary">
          A página que você está procurando não existe ou foi movida.
        </p>
      </div>

      {/* One link styled as a button: a button inside a link would be two stops for one action */}
      {external ? (
        <a href={homeHref} className={HOME_LINK_CLASSES}>{homeLabel}</a>
      ) : (
        <Link href={homeHref} className={HOME_LINK_CLASSES}>{homeLabel}</Link>
      )}
    </main>
  )
}
