'use client'
import { useSession } from 'next-auth/react'

export interface User {
  name: string
  email: string
}

const DEFAULT_USER: User = { name: '', email: '' }

export function useUser(): User {
  const { data: session } = useSession()

  if (!session?.user) return DEFAULT_USER

  return {
    name: session.user.name ?? '',
    email: session.user.email ?? '',
  }
}
