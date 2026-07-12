'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { capitalizeMonth } from '@/lib/utils/transactions'
import type { Transaction } from '@/types/transaction'

interface ModalTransactionDetailProps {
  transaction: Transaction | null
  onClose: () => void
}

export function ModalTransactionDetail({ transaction, onClose }: ModalTransactionDetailProps) {
  const month = transaction ? capitalizeMonth(transaction.month) : ''
  const date  = transaction ? (transaction.transactionDate ?? transaction.date) : ''
  const [showAttachment, setShowAttachment] = useState(false)

  return (
    <>
    <Modal isOpen={transaction !== null} onClose={onClose} title="Detalhes da transação">
      <dl className="flex flex-col gap-4 mt-6">
        <div className="flex justify-between items-center border-b border-success pb-4">
          <dt className="text-body text-text-secondary">Tipo</dt>
          <dd className="text-body-semibold text-text-primary">{transaction?.label}</dd>
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
          <dd className="text-label text-text-primary">{transaction?.amount}</dd>
        </div>
      </dl>

      {transaction?.attachment && (
        <div className="mt-6 flex flex-col gap-3">
          <p className="text-body-semibold text-text-primary">Anexo</p>
          {transaction.attachment.startsWith('data:image') ? (
            <button
              type="button"
              onClick={() => setShowAttachment(true)}
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
              className="flex items-center gap-3 h-12 px-4 rounded-md border border-primary-900 hover:opacity-80 transition-opacity"
            >
              <span className="material-icons text-icon-md text-text-secondary">picture_as_pdf</span>
              <span className="text-body text-text-secondary">Ver anexo (PDF)</span>
            </button>
          )}
        </div>
      )}

      <div className="mt-8">
        <Button variant="light" label="Fechar" onClick={onClose} fullWidth />
      </div>
    </Modal>

    {showAttachment && transaction?.attachment && (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70">
        <div className="relative bg-inverse rounded-md p-6 max-w-2xl w-full mx-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="text-heading font-bold text-text-primary">Anexo da transação</p>
            <button
              type="button"
              onClick={() => setShowAttachment(false)}
              className="text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Fechar visualização do anexo"
            >
              <span className="material-icons text-icon-md">close</span>
            </button>
          </div>
          {transaction.attachment.startsWith('data:image') ? (
            <img
              src={transaction.attachment}
              alt="Anexo da transação"
              className="w-full rounded-md object-contain max-h-[60vh]"
            />
          ) : (
            <iframe
              src={transaction.attachment}
              className="w-full rounded-md"
              style={{ height: '60vh' }}
              title="Anexo PDF da transação"
            />
          )}
          <a
            href={transaction.attachment}
            download={`anexo-${transaction.id}`}
            className="flex items-center justify-center gap-2 h-12 rounded-md bg-primary-900 text-inverse text-body-semibold hover:opacity-90 transition-opacity"
          >
            <span className="material-icons text-icon-md">download</span>
            Baixar anexo
          </a>
        </div>
      </div>
    )}
    </>
  )
}
