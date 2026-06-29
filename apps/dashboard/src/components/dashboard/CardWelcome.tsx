'use client'

import { useBalance } from '@/hooks/use-balance'

interface CardWelcomeProps {
  name: string
  date: string
  balance: string
  accountType: string
}

export function CardWelcome({ name, date, balance, accountType }: CardWelcomeProps) {
  const { isVisible, displayBalance, toggle } = useBalance(balance)

  return (
    <div className="relative bg-primary-900 rounded-md overflow-hidden pt-10 px-6 pb-6 md:p-8 lg:p-6">
      <div className="flex flex-col items-center gap-10 md:flex-row md:items-start md:justify-between md:gap-0">
        <div className="text-center md:text-left">
          <h1 className="text-heading font-semibold text-inverse">Olá, {name}! :)</h1>
          <p className="text-meta text-inverse mt-6">{date}</p>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-6">
            <span className="text-label text-inverse">Saldo</span>
            <button
              type="button"
              onClick={toggle}
              aria-label={isVisible ? 'Ocultar saldo' : 'Exibir saldo'}
              className="text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-900 rounded-md"
            >
              <span className="material-icons text-icon-xs leading-none">
                {isVisible ? 'visibility' : 'visibility_off'}
              </span>
            </button>
          </div>
          <div className="mt-4 border-t-2 border-accent" />
          <p className="mt-4 text-body text-inverse">{accountType}</p>
          <p className="mt-2 text-display text-inverse">{displayBalance}</p>
        </div>
      </div>
    </div>
  )
}
