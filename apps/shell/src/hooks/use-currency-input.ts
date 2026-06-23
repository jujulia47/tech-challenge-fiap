'use client'

import { useState } from 'react'
import { formatCents } from '@/lib/utils/currency'

export function useCurrencyInput(initialDigits = '0') {
  const [digits, setDigits] = useState(initialDigits)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '')
    setDigits(raw || '0')
  }

  const formatted = formatCents(parseInt(digits, 10))

  return { digits, formatted, handleChange, setDigits }
}
