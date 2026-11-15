'use client'

import { useCallback, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Toast } from '@bytebank/design-system'

export function SessionEndedNotice() {
  const reason = useSearchParams().get('reason')
  const [visible, setVisible] = useState(true)
  const close = useCallback(() => setVisible(false), [])

  // Not rendered otherwise: a hidden Toast is still in the page for a screen reader
  if (reason !== 'idle' || !visible) return null

  return (
    <Toast
      type="error"
      visible
      onClose={close}
      message="Sua sessão foi encerrada por inatividade. Entre novamente para continuar."
    />
  )
}
