'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useTransactionsContext } from '@/context/TransactionsContext'
import { useToast } from '@/hooks/use-toast'
import { Toast } from '@/components/ui/Toast'
import { TransactionItem } from '@/components/dashboard/TransactionItem'
import { ModalConfirmDelete } from '@/components/ui/ModalConfirmDelete'
import { ModalEditTransaction } from '@/components/dashboard/ModalEditTransaction'
import { ModalTransactionDetail } from '@/components/dashboard/ModalTransactionDetail'
import { Select } from '@/components/ui/Select'
import { groupByMonth, capitalizeMonth, TRANSACTION_OPTIONS } from '@/lib/utils/transactions'
import type { Transaction } from '@/types/transaction'

export default function StatementPage() {
  const { transactions, deleteTransaction } = useTransactionsContext()
  const { toast, showToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<Transaction | null>(null)
  const [detailTx, setDetailTx] = useState<Transaction | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterMonth, setFilterMonth] = useState('')

  const monthOptions = useMemo(() => {
    const months = [...new Set(transactions.map(tx => tx.month))]
    return [
      { value: '', label: 'Todos os meses' },
      ...months.map(m => ({ value: m, label: capitalizeMonth(m) })),
    ]
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const matchType = !filterType || tx.label === filterType
      const matchMonth = !filterMonth || tx.month === filterMonth
      return matchType && matchMonth
    })
  }, [transactions, filterType, filterMonth])

  const groups = groupByMonth(filtered)
  const deletingTx = transactions.find(t => t.id === deletingId)

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

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <Link href="http://localhost:3000/dashboard" className="text-body text-text-secondary hover:text-text-primary transition-colors">
              Início
            </Link>
          </li>
          <li aria-hidden="true">
            <span className="text-body text-text-secondary">/</span>
          </li>
          <li>
            <span className="text-body text-text-primary">Extrato completo</span>
          </li>
        </ol>
      </nav>

      <h1 className="text-heading font-bold text-text-primary">
        Extrato completo
      </h1>

      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        <div className="w-full md:w-select-md">
          <Select
            label="Tipo de transação"
            placeholder="Todos os tipos"
            options={[{ value: '', label: 'Todos os tipos' }, ...TRANSACTION_OPTIONS]}
            value={filterType}
            onChange={setFilterType}
          />
        </div>
        <div className="w-full md:w-select-md">
          <Select
            label="Mês"
            placeholder="Todos os meses"
            options={monthOptions}
            value={filterMonth}
            onChange={setFilterMonth}
          />
        </div>
      </div>

      <div className="bg-surface-card rounded-md px-6 py-8 flex flex-col gap-6">
        {groups.length === 0 ? (
          <p className="text-body text-text-secondary">
            Nenhuma transação encontrada
          </p>
        ) : (
          groups.map(group => (
            <div key={group.month}>
              <p className="text-meta-semibold text-success mb-2">
                {capitalizeMonth(group.month)}
              </p>
              {group.transactions.map((tx, idx) => (
                <TransactionItem
                  key={tx.id}
                  id={tx.id}
                  date={tx.date}
                  label={tx.label}
                  amount={tx.amount}
                  showDivider={idx < group.transactions.length - 1}
                  onDetail={(id) => setDetailTx(transactions.find(t => t.id === id) ?? null)}
                  onEdit={(id) => setEditingTx(transactions.find(t => t.id === id) ?? null)}
                  onDelete={setDeletingId}
                />
              ))}
            </div>
          ))
        )}
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
    </div>
  )
}
