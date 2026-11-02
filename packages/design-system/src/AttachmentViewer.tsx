'use client'

import { useEffect } from 'react'
import { useModalFocus } from './modalFocus'

interface AttachmentViewerProps {
  attachment: string
  transactionId: string
  onClose: () => void
}

export function AttachmentViewer({ attachment, transactionId, onClose }: AttachmentViewerProps) {
  const boxRef = useModalFocus<HTMLDivElement>(true)

  // It opens over the detail modal, and Escape must close only this one
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key !== 'Escape') return
      event.stopPropagation()
      onClose()
    }
    window.addEventListener('keydown', handleKey, true)
    return () => window.removeEventListener('keydown', handleKey, true)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70">
      <div
        ref={boxRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="attachment-viewer-title"
        className="relative bg-inverse rounded-md p-6 max-w-2xl w-full mx-4 flex flex-col gap-4 outline-none"
      >
        <div className="flex items-center justify-between">
          <p id="attachment-viewer-title" className="text-heading font-bold text-text-primary">Anexo da transação</p>
          <button
            type="button"
            onClick={onClose}
            className="text-text-secondary hover:text-text-primary transition-colors"
            aria-label="Fechar visualização do anexo"
          >
            <span className="material-icons text-icon-md" aria-hidden="true">close</span>
          </button>
        </div>
        {attachment.startsWith('data:image') ? (
          <img
            src={attachment}
            alt="Anexo da transação"
            className="w-full rounded-md object-contain max-h-[60vh]"
          />
        ) : (
          <iframe
            src={attachment}
            className="w-full h-[60vh] rounded-md"
            title="Anexo PDF da transação"
          />
        )}
        <a
          href={attachment}
          download={`anexo-${transactionId}`}
          className="flex items-center justify-center gap-2 h-12 rounded-md bg-primary-900 text-inverse text-body-semibold hover:opacity-90 transition-opacity"
        >
          <span className="material-icons text-icon-md" aria-hidden="true">download</span>
          Baixar anexo
        </a>
      </div>
    </div>
  )
}
