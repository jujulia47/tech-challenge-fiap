import type { NavItem } from '@bytebank/design-system'

// The shell only shows this menu on a 404 under /dashboard: every page is in another zone
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Início',           href: '/dashboard',              external: true },
  { label: 'Transferências',   href: '/dashboard/transfers',    external: true },
  { label: 'Extrato completo', href: '/transactions',           external: true },
  { label: 'Investimentos',    href: '/dashboard/investments',  external: true },
  { label: 'Outros serviços',  href: '/dashboard/services',     external: true },
]
