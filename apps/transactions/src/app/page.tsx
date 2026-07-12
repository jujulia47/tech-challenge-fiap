'use client'

import { useState, useMemo, useEffect } from 'react'
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
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5

  useEffect(() => { setPage(1) }, [filterType, filterMonth])

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

  const allTransactions = filtered
  const totalPages = Math.ceil(allTransactions.length / PAGE_SIZE)
  const paginated = allTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const paginatedGroups = groupByMonth(paginated)
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

      <div className="bg-surface-card rounded-md px-6 py-8 flex flex-col gap-6 min-h-[400px]">
        {paginatedGroups.length === 0 ? (
          <p className="text-body text-text-secondary">
            Nenhuma transação encontrada
          </p>
        ) : (
          paginatedGroups.map(group => (
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

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-meta text-text-secondary">
            Mostrando {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, allTransactions.length)} de {allTransactions.length} transações
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 px-3 rounded-md text-meta text-text-secondary disabled:opacity-30 hover:bg-primary-50 transition-colors"
            >
              ‹ Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i-1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) => p === '...' ? (
                <span key={`ellipsis-${i}`} className="h-8 w-8 flex items-center justify-center text-meta text-text-secondary">...</span>
              ) : (
                <button
                  key={p}
                  onClick={() => setPage(p as number)}
                  className={`h-8 w-8 rounded-md text-meta transition-colors ${
                    page === p
                      ? 'border border-primary-900 text-primary-900 font-semibold'
                      : 'text-text-secondary hover:bg-primary-50'
                  }`}
                >
                  {p}
                </button>
              ))
            }
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 px-3 rounded-md text-meta text-text-secondary disabled:opacity-30 hover:bg-primary-50 transition-colors"
            >
              Próxima ›
            </button>
          </div>
        </div>
      )}

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
