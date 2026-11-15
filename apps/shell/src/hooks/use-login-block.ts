'use client'

import { useCallback, useEffect, useState } from 'react'
import { msUntilNextChange } from '@bytebank/utils'

interface LoginBlock {
  email: string
  until: number
  // What a screen reader hears once, and what the counter shows now
  initialRemainingMs: number
  remainingMs: number
}

export function useLoginBlock() {
  const [block, setBlock] = useState<LoginBlock | null>(null)
  const until = block?.until

  const startBlock = useCallback((email: string, retryAfterMs: number) => {
    setBlock({ email, until: Date.now() + retryAfterMs, initialRemainingMs: retryAfterMs, remainingMs: retryAfterMs })
  }, [])

  // Wakes up when the text changes: once a minute, then once a second in the last minute.
  // The block ends, and the button comes back, when the wait is over.
  useEffect(() => {
    if (until === undefined) return
    let timer: ReturnType<typeof setTimeout>

    function schedule() {
      const remaining = until! - Date.now()
      timer = setTimeout(() => {
        const left = until! - Date.now()
        if (left <= 0) {
          setBlock(null)
          return
        }
        setBlock(current => current && { ...current, remainingMs: left })
        schedule()
      }, msUntilNextChange(remaining))
    }

    schedule()
    return () => clearTimeout(timer)
  }, [until])

  return { block, startBlock }
}
