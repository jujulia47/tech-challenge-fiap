'use client'

import { useCallback, useEffect, useState } from 'react'
import { minutesLeft, msUntilNextMinute } from '@bytebank/utils'

interface LoginBlock {
  email: string
  until: number
  initialMinutes: number
  minutes: number
}

export function useLoginBlock() {
  const [block, setBlock] = useState<LoginBlock | null>(null)
  const until = block?.until

  const startBlock = useCallback((email: string, retryAfterMs: number) => {
    const minutes = minutesLeft(retryAfterMs)
    setBlock({ email, until: Date.now() + retryAfterMs, initialMinutes: minutes, minutes })
  }, [])

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
        setBlock(current => current && { ...current, minutes: minutesLeft(left) })
        schedule()
      }, msUntilNextMinute(Math.max(remaining, 1)))
    }

    schedule()
    return () => clearTimeout(timer)
  }, [until])

  return { block, startBlock }
}
