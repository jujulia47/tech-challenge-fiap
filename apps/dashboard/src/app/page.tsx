'use client'

import { useState } from 'react'
import { CardNewTransaction } from '@/components/dashboard/CardNewTransaction'
import { CardCharts } from '@/components/dashboard/CardCharts'
import { CardStatement } from '@/components/dashboard/CardStatement'
import { ModalConfirmDelete } from '@/components/ui/ModalConfirmDelete'
import { ModalEditTransaction } from '@/components/dashboard/ModalEditTransaction'
import { ModalTransactionDetail } from '@/components/dashboard/ModalTransactionDetail'
import { useTransactionsContext } from '@/context/TransactionsContext'
import { groupByMonth } from '@/lib/utils/transactions'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/hooks/use-toast'
import { DashboardWelcome } from '@/components/layout/DashboardWelcome'
import type { Transaction } from '@/types/transaction'

export default function DashboardPage() {
  const { transactions, loading, deleteTransaction } = useTransactionsContext()
  console.log('page loading:', loading, 'transactions:', transactions.length)
  const { toast, showToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [detailTx, setDetailTx] = useState<Transaction | null>(null)

  const deletingTx = transactions.find(t => t.id === deletingId)
  const groups = groupByMonth(transactions)

  function handleDeleteClick(id: string) {
    setDeletingId(id)
  }

  async function handleDeleteConfirm() {
    try {
      await deleteTransaction(deletingId!)
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="text-body text-text-secondary">Carregando transações...</span>
      </div>
    )
  }

  return (
    <>
      <div className="w-card-sm mx-auto md:w-card-md lg:w-full flex flex-col gap-4 lg:grid lg:grid-cols-[1fr_380px] lg:items-start lg:gap-6">

        <div className="flex flex-col gap-4 lg:gap-6">
          <DashboardWelcome />
          <CardCharts transactions={transactions} />
          <CardNewTransaction
            onSuccess={(msg) => showToast(msg, 'success')}
            onError={(msg) => showToast(msg, 'error')}
          />
        </div>

        <CardStatement groups={groups} onDetail={handleDetail} onEdit={handleEdit} onDelete={handleDeleteClick} limit={4} showViewMore />

      </div>

      <ModalTransactionDetail
        transaction={detailTx}
        onClose={() => setDetailTx(null)}
      />

      <ModalConfirmDelete
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        transactionLabel={deletingTx?.label}
      />

      <ModalEditTransaction
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
        onSuccess={() => showToast('Transação editada com sucesso', 'success')}
      />

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </>
  )
}
