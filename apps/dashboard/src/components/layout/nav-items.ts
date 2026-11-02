import type { NavItem, ProfileMenuItem } from '@bytebank/design-system'

// Same-zone paths are relative to the basePath. Cross-zone ones are absolute and marked external.
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Início',          href: '/' },
  { label: 'Transações',      href: '/transactions', external: true },
  { label: 'Investimentos',   href: '/investments' },
  { label: 'Outros serviços', href: '/services' },
]

export const PROFILE_ITEMS: readonly ProfileMenuItem[] = [
  { label: 'Minha conta',   href: '/account' },
  { label: 'Configurações', href: '/coming-soon' },
]
