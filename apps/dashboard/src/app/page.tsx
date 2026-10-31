'use client'

import { useMemo, useState } from 'react'
import { CardNewTransaction } from '@/components/dashboard/CardNewTransaction'
import { CardCharts } from '@/components/dashboard/CardCharts'
import { CardStatement } from '@/components/dashboard/CardStatement'
import { ModalConfirmDelete, Toast } from '@bytebank/design-system'
import { ModalEditTransaction } from '@/components/dashboard/ModalEditTransaction'
import { ModalTransactionDetail } from '@/components/dashboard/ModalTransactionDetail'
import { useDeleteTransactionMutation, useGetStatementQuery } from '@/store/transactionsApi'
import { TRANSACTION_TYPE_LABELS } from '@bytebank/utils'
import { useToast } from '@/hooks/use-toast'
import { DashboardWelcome } from '@/components/layout/DashboardWelcome'
import type { TransactionDTO } from '@bytebank/core'

export default function DashboardPage() {
  const { data: statement, isLoading, isError } = useGetStatementQuery()
  const [deleteTransaction] = useDeleteTransactionMutation()
  const { toast, showToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<TransactionDTO | null>(null)
  const [detailTx, setDetailTx] = useState<TransactionDTO | null>(null)

  const groups = useMemo(() => statement?.groups ?? [], [statement])
  const transactions = useMemo(() => groups.flatMap(group => group.transactions), [groups])
  const deletingTx = transactions.find(t => t.id === deletingId)

  function handleDeleteClick(id: string) {
    setDeletingId(id)
  }

  async function handleDeleteConfirm() {
    try {
      await deleteTransaction(deletingId!).unwrap()
      showToast('Transação excluída com sucesso', 'success')
    } catch {
      showToast('Erro ao excluir transação', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  function handleDetail(id: string) {
    const tx = transactions.find(t => t.id === id) ?? null
    setDetailTx(tx)
  }

  function handleEdit(id: string) {
    const tx = transactions.find(t => t.id === id) ?? null
    setEditingTx(tx)
  }

  return (
    <>
      <div className="w-card-sm mx-auto md:w-card-md lg:w-full flex flex-col gap-4 lg:gap-6">
        <DashboardWelcome />
        <CardCharts />
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 lg:items-start">
          <div className="flex-1">
            <CardNewTransaction
              onSuccess={(msg) => showToast(msg, 'success')}
              onError={(msg) => showToast(msg, 'error')}
            />
          </div>
          <div className="lg:w-[380px] shrink-0">
            <CardStatement
              groups={groups}
              loading={isLoading}
              loadFailed={isError}
              onDetail={handleDetail}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              limit={4}
              showViewMore
            />
          </div>
        </div>
      </div>
      <ModalTransactionDetail transaction={detailTx} onClose={() => setDetailTx(null)} />
      <ModalConfirmDelete
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        transactionLabel={deletingTx && TRANSACTION_TYPE_LABELS[deletingTx.type]}
      />
      <ModalEditTransaction
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
        onSuccess={() => showToast('Transação editada com sucesso', 'success')}
        onError={(msg) => showToast(msg, 'error')}
      />
      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </>
  )
}
