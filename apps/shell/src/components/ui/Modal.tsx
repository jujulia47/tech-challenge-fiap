'use client'

import { useEffect } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  showCloseButton?: boolean
}

function toSlug(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '-')
}

export function Modal({ isOpen, onClose, title, children, showCloseButton = true }: ModalProps) {
  const titleId = `modal-title-${toSlug(title)}`

  useEffect(() => {
    if (!isOpen) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button
        type="button"
        className="modal-backdrop bg-text-primary/50"
        onClick={onClose}
        aria-label="Fechar modal"
      />
      <div className="modal-box bg-surface-modal rounded-md w-full max-w-lg p-6 relative">
        {showCloseButton && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="absolute top-4 right-4 text-text-primary hover:opacity-70 transition-opacity"
          >
            <span className="material-icons text-icon-md">close</span>
          </button>
        )}
        <h2 id={titleId} className="text-heading font-bold text-text-primary">
          {title}
        </h2>
        {children}
      </div>
    </div>
  )
}
