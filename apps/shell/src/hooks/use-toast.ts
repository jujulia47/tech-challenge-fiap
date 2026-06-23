'use client'

import { useState, useCallback } from 'react'

interface ToastState {
  message: string
  type: 'success' | 'error'
  visible: boolean
}

export function useToast() {
  const [toast, setToast] = useState<ToastState>({
    message: '',
    type: 'success',
    visible: false,
  })

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type, visible: true })
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }))
    }, 3000)
  }, [])

  return { toast, showToast }
}
