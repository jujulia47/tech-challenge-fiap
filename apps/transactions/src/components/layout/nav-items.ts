import type { NavItem, ProfileMenuItem } from '@bytebank/design-system'

// Same-zone paths are relative to the basePath. Cross-zone ones are absolute and marked external.
export const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Início',          href: '/dashboard', external: true },
  { label: 'Transações',      href: '/' },
  { label: 'Investimentos',   href: '/dashboard/investments', external: true },
  { label: 'Outros serviços', href: '/dashboard/services', external: true },
]

export const PROFILE_ITEMS: readonly ProfileMenuItem[] = [
  // The account pages live in the dashboard zone
  { label: 'Minha conta',   href: '/dashboard/account',     crossZone: true },
  { label: 'Configurações', href: '/dashboard/coming-soon', crossZone: true },
]
