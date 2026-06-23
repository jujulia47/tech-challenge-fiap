'use client'

import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'

interface ModalConfirmDeleteProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  transactionLabel?: string
}

export function ModalConfirmDelete({ isOpen, onClose, onConfirm, transactionLabel }: ModalConfirmDeleteProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Excluir transação" showCloseButton={false}>
      <p className="text-body text-text-secondary mt-2 mb-6">
        {transactionLabel
          ? `Tem certeza que deseja excluir "${transactionLabel}"? Esta ação não pode ser desfeita.`
          : 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.'}
      </p>
      <div className="flex gap-3 justify-end">
        <Button variant="light" label="Cancelar" onClick={onClose} autoFocus />
        <Button variant="error-outline" label="Excluir" onClick={onConfirm} />
      </div>
    </Modal>
  )
}
