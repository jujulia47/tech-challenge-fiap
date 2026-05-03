'use client'
import { useState, useEffect } from 'react'

export interface User {
  name: string
  email: string
}

const DEFAULT_USER: User = { name: 'Joana', email: '' }

export function useUser(): User {
  const [user, setUser] = useState<User>(DEFAULT_USER)

  useEffect(() => {
    try {
      const stored = localStorage.getItem('bytebank_user')
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is unavailable during SSR; useEffect is the only valid place to read it
      if (stored) setUser(JSON.parse(stored))
    } catch {
      // fallback to default
    }
  }, [])

  return user
}
