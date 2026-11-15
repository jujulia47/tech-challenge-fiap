'use client'

import { useEffect } from 'react'
import { cn } from '@bytebank/utils'

// Long enough to read; an error a little longer, since the person may need to act on it.
// The progress bar of theme.css (.toast-progress, .toast-progress-long) follows these times.
export const TOAST_DURATION_MS = { success: 5_000, error: 8_000 } as const

interface ToastProps {
  message: string
  type: 'success' | 'error'
  visible: boolean
  // With it, the toast closes by itself, by the × button and by Escape
  onClose?: () => void
}

export function Toast({ message, type, visible, onClose }: ToastProps) {
  useEffect(() => {
    if (!visible || !onClose) return
    const timer = setTimeout(onClose, TOAST_DURATION_MS[type])
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', closeOnEscape)
    }
    // A new message starts its time again
  }, [visible, onClose, type, message])

  return (
    <div
      className={cn(
        'fixed bottom-6 left-6 z-50 max-w-xs rounded-md overflow-hidden',
        'flex flex-col',
        'text-body-semibold text-inverse',
        'transition-opacity duration-300',
        type === 'success' ? 'bg-success' : 'bg-error',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      <div className="flex items-center gap-2 p-4">
        <span className="material-icons text-icon-sm" aria-hidden="true">
          {type === 'success' ? 'check_circle' : 'error'}
        </span>
        {/* Only the message is announced, not the label of the button */}
        <span role="alert" aria-live="polite" className="flex-1">
          {message}
        </span>
        {visible && onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar aviso"
            className="flex items-center justify-center min-w-6 min-h-6 rounded-md text-inverse hover:bg-inverse/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inverse"
          >
            <span className="material-icons text-icon-sm" aria-hidden="true">close</span>
          </button>
        )}
      </div>

      {visible && onClose && (
        <div className="h-1 bg-inverse/40 w-full">
          <div className={cn('h-full bg-inverse toast-progress', type === 'error' && 'toast-progress-long')} />
        </div>
      )}
    </div>
  )
}
