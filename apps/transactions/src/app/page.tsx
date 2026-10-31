'use client'

import { useState, useMemo } from 'react'
import { useDeleteTransactionMutation, useGetTransactionsQuery } from '@/store/transactionsApi'
import { useToast } from '@/hooks/use-toast'
import { Toast, ModalConfirmDelete, Select } from '@bytebank/design-system'
import { StatementResults } from '@/components/dashboard/StatementResults'
import { ModalEditTransaction } from '@/components/dashboard/ModalEditTransaction'
import { ModalTransactionDetail } from '@/components/dashboard/ModalTransactionDetail'
import { PaginationControls } from '@/components/PaginationControls'
import { transactionDirection, type TransactionDTO } from '@bytebank/core'
import {
  TRANSACTION_TYPE_LABELS,
  TRANSACTION_TYPE_OPTIONS,
  formatDateBR,
  formatMonthKey,
  formatSignedCents,
  groupDtosByMonth,
} from '@bytebank/utils'

export default function StatementPage() {
  const { data, isLoading, isError } = useGetTransactionsQuery()
  const [deleteTransaction] = useDeleteTransactionMutation()
  const transactions = useMemo(() => data ?? [], [data])
  const { toast, showToast } = useToast()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editingTx, setEditingTx] = useState<TransactionDTO | null>(null)
  const [detailTx, setDetailTx] = useState<TransactionDTO | null>(null)
  const [filterType, setFilterType] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 5

  // Changing a filter resets pagination and search in the same update
  function handleFilterTypeChange(value: string) {
    if (value === filterType) return
    setFilterType(value)
    setPage(1)
    setSearchQuery('')
  }

  function handleFilterMonthChange(value: string) {
    if (value === filterMonth) return
    setFilterMonth(value)
    setPage(1)
    setSearchQuery('')
  }

  const monthOptions = useMemo(() => {
    const monthKeys = [...new Set(transactions.map(tx => tx.date.slice(0, 7)))]
    return [
      { value: '', label: 'Todos os meses' },
      ...monthKeys.map(monthKey => ({ value: monthKey, label: formatMonthKey(monthKey) })),
    ]
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter(tx => {
      const matchType = !filterType || tx.type === filterType
      const matchMonth = !filterMonth || tx.date.startsWith(filterMonth)
      return matchType && matchMonth
    })
  }, [transactions, filterType, filterMonth])

  const searched = useMemo(() => {
    if (!searchQuery.trim()) return filtered
    const query = searchQuery.toLowerCase()
    return filtered.filter(tx =>
      TRANSACTION_TYPE_LABELS[tx.type].toLowerCase().includes(query) ||
      formatSignedCents(tx.amountInCents, transactionDirection(tx.type)).includes(searchQuery) ||
      formatDateBR(tx.date).includes(searchQuery)
    )
  }, [filtered, searchQuery])

  const allTransactions = searched
  const totalPages = Math.ceil(allTransactions.length / PAGE_SIZE)
  const paginated = allTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const paginatedGroups = groupDtosByMonth(paginated)
  const deletingTx = transactions.find(t => t.id === deletingId)

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

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="breadcrumb">
        <ol className="flex items-center gap-2">
          <li>
            <a href="/dashboard" className="text-body text-text-secondary hover:text-text-primary transition-colors">
              Início
            </a>
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

      <div className="flex flex-col md:flex-row gap-4 items-end">
        <div className="flex flex-col gap-1 w-full md:w-select-md">
          <label className="text-body-semibold text-text-primary">Buscar</label>
          <div className="relative">
            <span
              className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-icon-xs text-text-secondary pointer-events-none"
              aria-hidden="true"
            >
              search
            </span>
            <input
              type="search"
              placeholder="Buscar transação..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              aria-label="Buscar transações"
              className="h-12 w-full pl-10 pr-4 rounded-md border border-primary-900 bg-inverse text-body text-primary-800 focus:border-2 focus:border-primary-800 focus:outline-none"
            />
          </div>
        </div>
        <div className="w-full md:w-select-md">
          <Select
            label="Tipo de transação"
            placeholder="Todos os tipos"
            options={[{ value: '', label: 'Todos os tipos' }, ...TRANSACTION_TYPE_OPTIONS]}
            value={filterType}
            onChange={handleFilterTypeChange}
          />
        </div>
        <div className="w-full md:w-select-md">
          <Select
            label="Mês"
            placeholder="Todos os meses"
            options={monthOptions}
            value={filterMonth}
            onChange={handleFilterMonthChange}
          />
        </div>
      </div>

      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {allTransactions.length} transações encontradas
      </div>

      <div className="bg-surface-card rounded-md px-6 py-8 flex flex-col gap-6 min-h-[400px]">
        <StatementResults
          groups={paginatedGroups}
          loading={isLoading}
          loadFailed={isError}
          onDetail={(id) => setDetailTx(transactions.find(t => t.id === id) ?? null)}
          onEdit={(id) => setEditingTx(transactions.find(t => t.id === id) ?? null)}
          onDelete={setDeletingId}
        />
      </div>

      <PaginationControls
        page={page}
        totalPages={totalPages}
        totalItems={allTransactions.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <ModalTransactionDetail
        transaction={detailTx}
        onClose={() => setDetailTx(null)}
      />

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
        onError={(message) => showToast(message, 'error')}
      />

      <Toast message={toast.message} type={toast.type} visible={toast.visible} />
    </div>
  )
}
