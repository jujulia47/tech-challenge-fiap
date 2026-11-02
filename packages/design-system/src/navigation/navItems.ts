export interface NavItem {
  label: string
  href: string
  // Cross-zone links point to another micro-frontend served under the shell
  // origin. They must be plain <a> (root-relative) so Next's basePath is not
  // prepended and the browser performs a hard navigation across zones.
  external?: boolean
}

// The root of a zone is active only on itself; any other item also covers the pages under it
export function isActiveNavItem(item: NavItem, pathname: string): boolean {
  if (item.href === '/') return pathname === item.href
  return pathname === item.href || pathname.startsWith(item.href + '/')
}
