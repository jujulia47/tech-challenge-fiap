'use client'

import { useState } from 'react'
import { transactionDirection, type TransactionDTO } from '@bytebank/core'
import { TRANSACTION_TYPE_LABELS, formatDateBR, formatMonthKey, formatSignedCents, onIntent, preloadable } from '@bytebank/utils'
import { Button } from './Button'
import { lazyModal } from './lazy'
import { Modal } from './Modal'

const attachmentViewer = preloadable(() => import('./AttachmentViewer').then(module => module.AttachmentViewer))
const LazyAttachmentViewer = lazyModal(attachmentViewer, () => true)

interface ModalTransactionDetailProps {
  transaction: TransactionDTO | null
  onClose: () => void
}

export function ModalTransactionDetail({ transaction, onClose }: ModalTransactionDetailProps) {
  const type   = transaction ? TRANSACTION_TYPE_LABELS[transaction.type] : ''
  const date   = transaction ? formatDateBR(transaction.date) : ''
  const month  = transaction ? formatMonthKey(transaction.date.slice(0, 7)) : ''
  const amount = transaction ? formatSignedCents(transaction.amountInCents, transactionDirection(transaction.type)) : ''
  const [showAttachment, setShowAttachment] = useState(false)

  function handleClose() {
    setShowAttachment(false)
    onClose()
  }

  return (
    <>
    <Modal isOpen={transaction !== null} onClose={handleClose} title="Detalhes da transação">
      <dl className="flex flex-col gap-4 mt-6">
        <div className="flex justify-between items-center border-b border-success pb-4">
          <dt className="text-body text-text-secondary">Tipo</dt>
          <dd className="text-body-semibold text-text-primary">{type}</dd>
        </div>
        <div className="flex justify-between items-center border-b border-success pb-4">
          <dt className="text-body text-text-secondary">Data</dt>
          <dd className="text-body-semibold text-text-primary">{date}</dd>
        </div>
        <div className="flex justify-between items-center border-b border-success pb-4">
          <dt className="text-body text-text-secondary">Mês de referência</dt>
          <dd className="text-body-semibold text-text-primary">{month}</dd>
        </div>
        <div className="flex justify-between items-center">
          <dt className="text-body text-text-secondary">Valor</dt>
          <dd className="text-label text-text-primary">{amount}</dd>
        </div>
      </dl>

      {transaction?.attachment && (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-body-semibold text-text-primary">Anexo</p>
          {transaction.attachment.startsWith('data:image') ? (
            <button
              type="button"
              onClick={() => setShowAttachment(true)}
              {...onIntent(attachmentViewer.preload)}
              className="w-full rounded-md overflow-hidden border border-primary-900 hover:opacity-80 transition-opacity"
            >
              <img
                src={transaction.attachment}
                alt="Preview do anexo"
                className="w-full max-h-40 object-contain"
              />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowAttachment(true)}
              {...onIntent(attachmentViewer.preload)}
              className="flex items-center gap-3 h-12 px-4 rounded-md border border-primary-900 hover:opacity-80 transition-opacity"
            >
              <span className="material-icons text-icon-md text-text-secondary" aria-hidden="true">picture_as_pdf</span>
              <span className="text-body text-text-secondary">Ver anexo (PDF)</span>
            </button>
          )}
        </div>
      )}

      {transaction?.attachmentUnavailable && (
        <p className="mt-6 text-body text-text-secondary">Anexo indisponível</p>
      )}

      <div className="mt-8">
        <Button variant="light" label="Fechar" onClick={handleClose} fullWidth />
      </div>
    </Modal>

    {showAttachment && transaction?.attachment && (
      <LazyAttachmentViewer
        attachment={transaction.attachment}
        transactionId={transaction.id}
        onClose={() => setShowAttachment(false)}
      />
    )}
    </>
  )
}
