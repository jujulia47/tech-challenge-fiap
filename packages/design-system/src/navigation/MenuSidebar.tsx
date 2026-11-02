'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@bytebank/utils'
import { NavLink } from './NavLink'
import { isActiveNavItem, type NavItem } from './navItems'

interface MenuSidebarProps {
  items: readonly NavItem[]
}

export function MenuSidebar({ items }: MenuSidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="hidden lg:flex lg:flex-col w-sidebar bg-surface-card rounded-md shrink-0 self-stretch">
      <nav className="flex flex-col pt-4">
        <ul className="flex flex-col">
          {items.map((item, idx) => {
            const isActive = isActiveNavItem(item, pathname)
            const isLast = idx === items.length - 1

            return (
              <li key={item.href}>
                <NavLink
                  item={item}
                  className={cn(
                    'block py-4 text-center',
                    isActive
                      ? 'text-body font-bold text-success'
                      : 'text-body text-text-primary hover:bg-text-primary/5 transition-colors',
                  )}
                />
                {!isLast && (
                  <div
                    className={cn(
                      'border-t mx-6',
                      isActive ? 'border-success' : 'border-text-primary',
                    )}
                  />
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </aside>
  )
}
