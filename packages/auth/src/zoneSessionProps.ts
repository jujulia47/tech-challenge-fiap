import type { Session } from 'next-auth'

export interface ZoneSessionProps {
  basePath: string
  session: Session | null
  refetchOnWindowFocus: false
}

// The session read on the server goes to the provider, so the browser does not read it again on
// load, and the focus does not read it either. Each of those reads writes the cookie again, and
// one that answers after a write brings the old session back: docs/fase4/security.md, "The session race".
export function zoneSessionProps(basePath: string, session: Session | null): ZoneSessionProps {
  return { basePath, session, refetchOnWindowFocus: false }
}
