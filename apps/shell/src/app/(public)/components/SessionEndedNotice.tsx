'use client'

import { useSearchParams } from 'next/navigation'
import { Toast } from '@bytebank/design-system'

export function SessionEndedNotice() {
  const reason = useSearchParams().get('reason')

  // Not rendered otherwise: a hidden Toast is still in the page for a screen reader
  if (reason !== 'idle') return null

  return (
    <Toast
      type="error"
      visible
      message="Sua sessão foi encerrada por inatividade. Entre novamente para continuar."
    />
  )
}
