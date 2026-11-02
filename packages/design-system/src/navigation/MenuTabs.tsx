'use client'

import { usePathname } from 'next/navigation'
import { cn } from '@bytebank/utils'
import { NavLink } from './NavLink'
import { isActiveNavItem, type NavItem } from './navItems'

interface MenuTabsProps {
  items: readonly NavItem[]
}

export function MenuTabs({ items }: MenuTabsProps) {
  const pathname = usePathname()

  return (
    <nav className="hidden md:flex lg:hidden bg-bg-base">
      <ul className="grid grid-cols-4 w-full">
        {items.map(item => (
          <li key={item.href}>
            <NavLink
              item={item}
              className={cn(
                'block py-4 text-center',
                isActiveNavItem(item, pathname)
                  ? 'text-nav-bold text-success border-b border-success'
                  : 'text-body text-text-primary',
              )}
            />
          </li>
        ))}
      </ul>
    </nav>
  )
}
