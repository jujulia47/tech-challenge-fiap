import type { NavItem } from '@bytebank/design-system'

// The menu of the dashboard zone, for the stories of the three menus
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Início', href: '/' },
  { label: 'Transações', href: '/transactions', external: true },
  { label: 'Investimentos', href: '/investments' },
  { label: 'Outros serviços', href: '/services' },
]
