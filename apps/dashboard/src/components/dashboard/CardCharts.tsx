'use client'
import { useEffect, useState } from 'react'
import type { PeriodInMonths, TransactionType } from '@bytebank/core'
import { lazyPart } from '@bytebank/design-system'
import { chartDataFilters } from '@bytebank/store'
import {
  TRANSACTION_TYPE_LABELS,
  formatMonthKey,
  formatMonthShort,
  onIntent,
  preloadable,
  toggleTypeFilter,
  typeFilterMessage,
} from '@bytebank/utils'
import { ChartsSkeleton } from '@/components/dashboard/ChartsSkeleton'
import { useGetChartDataQuery, usePrefetch } from '@/store/transactionsApi'

const financialCharts = preloadable(() =>
  import('@/components/dashboard/FinancialCharts').then(module => module.FinancialCharts),
)

const LazyFinancialCharts = lazyPart(financialCharts, ChartsSkeleton)

const PERIODS: Array<{ value: PeriodInMonths; label: string }> = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 'all', label: 'Tudo' },
]

export function CardCharts() {
  const [period, setPeriod] = useState<PeriodInMonths>('all')
  const [typeFilter, setTypeFilter] = useState<TransactionType | null>(null)
  const { data, isLoading, isError } = useGetChartDataQuery(chartDataFilters(period, typeFilter))
  const prefetchChartData = usePrefetch('getChartData')
  const [filterMessage, setFilterMessage] = useState('')

  function changeTypeFilter(type: TransactionType | null) {
    const next = toggleTypeFilter(typeFilter, type)
    setTypeFilter(next)
    setFilterMessage(typeFilterMessage(next))
  }

  // Starts together with the data, instead of waiting for it
  useEffect(() => financialCharts.preload(), [])

  // No transactions at all. An empty period keeps the card: its buttons are the way out of it.
  if (data?.byType.length === 0 && period === 'all') return null

  const barData = data?.byMonth.map(({ monthKey, amountInCents }) => ({
    axisLabel: formatMonthShort(monthKey),
    month: formatMonthKey(monthKey),
    total: amountInCents / 100,
  })) ?? []

  const pieData = data?.byType.map(({ type, amountInCents }) => ({
    type,
    name: TRANSACTION_TYPE_LABELS[type],
    value: amountInCents / 100,
  })) ?? []

  return (
    <div className="bg-surface-card rounded-md p-6 flex flex-col gap-6">
      <h2 className="text-heading font-bold text-text-primary">Análise financeira</h2>
      <p className="sr-only" aria-live="polite">{filterMessage}</p>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              {...onIntent(() => prefetchChartData(chartDataFilters(value, typeFilter)))}
              className={`min-h-7 px-3 py-1 rounded-md text-meta transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900 ${
                period === value
                  ? 'bg-primary-900 text-inverse'
                  : 'bg-primary-50 text-primary-900 hover:opacity-80'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {typeFilter && (
          <button
            onClick={() => changeTypeFilter(null)}
            className="text-meta text-accent-strong hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900"
          >
            Limpar filtro: {TRANSACTION_TYPE_LABELS[typeFilter]} ×
          </button>
        )}
      </div>
      {isError ? (
        <p role="alert" aria-live="polite" className="text-body text-error">
          Não foi possível carregar os gráficos. Tente novamente.
        </p>
      ) : isLoading ? (
        <ChartsSkeleton />
      ) : pieData.length === 0 ? (
        <p className="text-body text-text-secondary">Nenhuma transação neste período</p>
      ) : (
        <LazyFinancialCharts
          barData={barData}
          pieData={pieData}
          typeFilter={typeFilter}
          onTypeClick={changeTypeFilter}
        />
      )}
    </div>
  )
}
