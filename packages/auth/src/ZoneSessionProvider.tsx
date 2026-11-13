import 'server-only'
import { SessionProvider } from 'next-auth/react'
import { auth } from './zone'
import { zoneSessionProps } from './zoneSessionProps'

interface ZoneSessionProviderProps {
  // Where the auth routes of the zone are, e.g. /dashboard/api/auth
  basePath: string
  children: React.ReactNode
}

// The session provider of a zone, started with the session of the request
export async function ZoneSessionProvider({ basePath, children }: ZoneSessionProviderProps) {
  return <SessionProvider {...zoneSessionProps(basePath, await auth())}>{children}</SessionProvider>
}
