'use client'

import { useSession } from 'next-auth/react'

export interface SessionUser {
  name: string
  email: string
}

const DEFAULT_USER: SessionUser = { name: '', email: '' }

// For display only: who is logged in comes from the session of the zone
export function useUser(): SessionUser {
  const { data: session } = useSession()

  if (!session?.user) return DEFAULT_USER

  return {
    name: session.user.name ?? '',
    email: session.user.email ?? '',
  }
}
