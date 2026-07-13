export interface NavItem {
  label: string
  href: string
  // Cross-zone links point to another micro-frontend served under the shell
  // origin. They must be plain <a> (root-relative) so Next's basePath is not
  // prepended and the browser performs a hard navigation across zones.
  external?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Início',          href: '/' },
  { label: 'Transações',      href: '/transactions', external: true },
  { label: 'Investimentos',   href: '/investments' },
  { label: 'Outros serviços', href: '/services' },
]
