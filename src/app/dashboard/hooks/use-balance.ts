import { useState } from 'react'

export function useBalance(initialBalance: string) {
  const [isVisible, setIsVisible] = useState(true)

  return {
    isVisible,
    displayBalance: isVisible ? initialBalance : '••••••',
    toggle: () => setIsVisible((prev) => !prev),
  }
}
