'use client'

import { useMemo } from 'react'
import { useDeleteTransactionMutation, useGetTransactionsQuery, useUpdateTransactionMutation } from '@/store/transactionsApi'
import { useStatementSearch } from '@/hooks/use-statement-search'
import { Select, TransactionActions } from '@bytebank/design-system'
import { StatementResults } from '@/components/dashboard/StatementResults'
import { PaginationControls } from '@/components/PaginationControls'
import { TRANSACTION_TYPE_OPTIONS, formatMonthKey, groupDtosByMonth } from '@bytebank/utils'

const PAGE_SIZE = 5

const resultsMessage = (count: number) =>
  count === 1 ? '1 transação encontrada' : `${count} transações encontradas`

export default function StatementPage() {
  const { data, isLoading, isError } = useGetTransactionsQuery()
  const [deleteTransaction] = useDeleteTransactionMutation()
  const [updateTransaction] = useUpdateTransactionMutation()
  const transactions = useMemo(() => data ?? [], [data])
  const { text, filters, results, page, changeText, changeFilters, changePage } = useStatementSearch(transactions)

  const monthOptions = useMemo(() => {
    const monthKeys = [...new Set(transactions.map(tx => tx.date.slice(0, 7)))]
    return [
      { value: '', label: 'Todos os meses' },
      ...monthKeys.map(monthKey => ({ value: monthKey, label: formatMonthKey(monthKey) })),
    ]
  }, [transactions])

  const totalPages = Math.ceil(results.length / PAGE_SIZE)
  // Deleting the last item of the last page must not leave an empty page
  const currentPage = Math.min(page, Math.max(totalPages, 1))
  const paginated = results.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const paginatedGroups = groupDtosByMonth(paginated)

  return (
    <TransactionActions
      transactions={transactions}
      remove={id => deleteTransaction(id).unwrap()}
      save={(id, changes) => updateTransaction({ id, changes }).unwrap()}
    >
      {({ actions }) => (
        <div className="flex flex-col gap-6">
          <nav aria-label="Navegação estrutural">
            <ol className="flex items-center gap-2">
              <li>
                <a href="/dashboard" className="inline-flex items-center min-h-6 text-body text-text-secondary hover:text-text-primary transition-colors">
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
              <label htmlFor="statement-search" className="text-body-semibold text-text-primary">Buscar</label>
              <div className="relative">
                <span
                  className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-icon-xs text-text-secondary pointer-events-none"
                  aria-hidden="true"
                >
                  search
                </span>
                <input
                  id="statement-search"
                  type="search"
                  placeholder="Buscar transação..."
                  value={text}
                  onChange={e => changeText(e.target.value)}
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
                value={filters.type}
                onChange={type => changeFilters({ type })}
              />
            </div>
            <div className="w-full md:w-select-md">
              <Select
                label="Mês"
                placeholder="Todos os meses"
                options={monthOptions}
                value={filters.month}
                onChange={month => changeFilters({ month })}
              />
            </div>
          </div>

          <div aria-live="polite" aria-atomic="true" className="sr-only">
            {!isLoading && resultsMessage(results.length)}
          </div>

          <div className="bg-surface-card rounded-md px-6 py-8 flex flex-col gap-6 min-h-[400px]">
            <StatementResults
              groups={paginatedGroups}
              loading={isLoading}
              loadFailed={isError}
              {...actions}
            />
          </div>

          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            totalItems={results.length}
            pageSize={PAGE_SIZE}
            onPageChange={changePage}
          />
        </div>
      )}
    </TransactionActions>
  )
}
