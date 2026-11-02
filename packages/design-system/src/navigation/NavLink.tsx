'use client'

import Link from 'next/link'
import type { NavItem } from './navItems'

interface NavLinkProps {
  item: NavItem
  className: string
  onClick?: () => void
}

// A page of the same zone goes through next/link, with prefetch; another zone needs a full page load
export function NavLink({ item, className, onClick }: NavLinkProps) {
  if (item.external) {
    return (
      <a href={item.href} onClick={onClick} className={className}>
        {item.label}
      </a>
    )
  }

  return (
    <Link href={item.href} prefetch onClick={onClick} className={className}>
      {item.label}
    </Link>
  )
}
