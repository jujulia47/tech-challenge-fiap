'use client'

import { useState } from 'react'

interface MountOnceOpenProps {
  isOpen: boolean
  children: React.ReactNode
}

// Holds a lazy modal back until it first opens, which is what delays its download. From then on
// it stays mounted, so closing keeps its state, such as the countdown of a blocked login.
export function MountOnceOpen({ isOpen, children }: MountOnceOpenProps) {
  const [hasOpened, setHasOpened] = useState(isOpen)
  if (isOpen && !hasOpened) setHasOpened(true)

  return hasOpened ? children : null
}
