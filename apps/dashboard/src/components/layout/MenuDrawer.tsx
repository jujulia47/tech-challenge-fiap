'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useModalFocus } from '@bytebank/design-system'
import { cn } from '@bytebank/utils'
import { NAV_ITEMS } from '@/components/layout/nav-items'

export function MenuDrawer() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const panelRef = useModalFocus<HTMLDivElement>(isOpen)

  return (
    <div className={cn('md:hidden')}>

      <button
        type="button"
        onClick={() => setIsOpen(true)}
        aria-label="Abrir menu de navegação"
        aria-expanded={isOpen}
      >
        <span className="material-icons text-accent text-icon-md" aria-hidden="true">menu</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div
        ref={panelRef}
        tabIndex={-1}
        inert={!isOpen}
        onKeyDown={e => { if (e.key === 'Escape') setIsOpen(false) }}
        role="dialog"
        aria-modal="true"
        aria-label="Menu de navegação"
        aria-hidden={!isOpen}
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-drawer bg-bg-base',
          'flex flex-col p-4 outline-none',
          'transition-transform duration-200 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          aria-label="Fechar menu"
          className="text-success self-start mb-4"
        >
          <span className="material-icons text-icon-sm" aria-hidden="true">close</span>
        </button>

        <nav>
          <ul>
            {NAV_ITEMS.map((item) => {
              const isActive =
                item.href === '/'
                  ? pathname === item.href
                  : pathname === item.href || pathname.startsWith(item.href + '/')

              const linkClassName = cn(
                'block py-4 border-b',
                isActive
                  ? 'text-nav-bold text-accent-strong border-success'
                  : 'text-nav text-text-primary border-text-primary',
              )

              return (
                <li key={item.href}>
                  {item.external ? (
                    <a
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={linkClassName}
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      href={item.href}
                      prefetch
                      onClick={() => setIsOpen(false)}
                      className={linkClassName}
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </div>
  )
}
