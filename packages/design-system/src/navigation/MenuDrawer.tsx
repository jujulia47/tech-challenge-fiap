'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { cn } from '@bytebank/utils'
import { useModalFocus } from '../modalFocus'
import { NavLink } from './NavLink'
import { isActiveNavItem, type NavItem } from './navItems'

interface MenuDrawerProps {
  items: readonly NavItem[]
}

export function MenuDrawer({ items }: MenuDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const panelRef = useModalFocus<HTMLDivElement>(isOpen)

  return (
    <div className="md:hidden">
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
            {items.map(item => (
              <li key={item.href}>
                <NavLink
                  item={item}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'block py-4 border-b',
                    isActiveNavItem(item, pathname)
                      ? 'text-nav-bold text-accent-strong border-success'
                      : 'text-nav text-text-primary border-text-primary',
                  )}
                />
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  )
}
