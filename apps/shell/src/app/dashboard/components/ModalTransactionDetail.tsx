'use client'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { capitalizeMonth } from '@/lib/utils/transactions'
import type { Transaction } from '@/app/dashboard/types/transaction'

interface ModalTransactionDetailProps {
  transaction: Transaction | null
  onClose: () => void
}

export function ModalTransactionDetail({ transaction, onClose }: ModalTransactionDetailProps) {
  const month = transaction ? capitalizeMonth(transaction.month) : ''
  const date  = transaction ? (transaction.transactionDate ?? transaction.date) : ''

  return (
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

      <div className="mt-8">
        <Button variant="light" label="Fechar" onClick={onClose} fullWidth />
      </div>
    </Modal>
  )
}
