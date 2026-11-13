'use client'

import { useState, type ReactNode } from 'react'
import type { TransactionDTO } from '@bytebank/core'
import { TRANSACTION_TYPE_LABELS } from '@bytebank/utils'
import type { TransactionEdit } from './ModalEditTransaction'
import { useToast } from './hooks/useToast'
import { Toast } from './Toast'
import type { TransactionAction } from './TransactionItem'
import { LazyModalConfirmDelete, LazyModalEditTransaction, LazyModalTransactionDetail, preloadActionModal } from './transactionModals'

// The props of a list of transactions: TransactionItem, CardStatement, StatementResults
export interface TransactionListActions {
  onDetail: (id: string) => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  onActionIntent: (action: TransactionAction) => void
}

// What the page gets: the actions for its list, and the toast for anything else it shows
export interface TransactionActionTools {
  actions: TransactionListActions
  showToast: (message: string, type: 'success' | 'error') => void
}

interface TransactionActionsProps {
  // The transactions the list shows, to find the one an action is about
  transactions: readonly TransactionDTO[]
  // The zone deletes and saves through its own store, so the design system does not depend on it
  remove: (id: string) => Promise<unknown>
  save: (id: string, changes: TransactionEdit) => Promise<unknown>
  children: (tools: TransactionActionTools) => ReactNode
}

// Details, edit and delete of a transaction, with their modals and the toast, the same in every zone
export function TransactionActions({ transactions, remove, save, children }: TransactionActionsProps) {
  const { toast, showToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editing, setEditing] = useState<TransactionDTO | null>(null)
  const [detail, setDetail] = useState<TransactionDTO | null>(null)

  const find = (id: string) => transactions.find(transaction => transaction.id === id) ?? null
  const deleting = deletingId === null ? null : find(deletingId)

  async function confirmDelete() {
    if (deletingId === null) return
    try {
      await remove(deletingId)
      showToast('Transação excluída com sucesso', 'success')
    } catch {
      showToast('Erro ao excluir transação', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      {children({
        actions: {
          onDetail: id => setDetail(find(id)),
          onEdit: id => setEditing(find(id)),
          onDelete: setDeletingId,
          onActionIntent: preloadActionModal,
        },
        showToast,
      })}

      <LazyModalTransactionDetail transaction={detail} onClose={() => setDetail(null)} />
      <LazyModalConfirmDelete
        isOpen={deletingId !== null}
        onClose={() => setDeletingId(null)}
        onConfirm={confirmDelete}
        transactionLabel={deleting ? TRANSACTION_TYPE_LABELS[deleting.type] : undefined}
      />
      <LazyModalEditTransaction
        transaction={editing}
        onSave={save}
        onClose={() => setEditing(null)}
        onSuccess={() => showToast('Transação editada com sucesso', 'success')}
        onError={message => showToast(message, 'error')}
      />
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </>
  )
}
