'use client'
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import type { PeriodInMonths, TransactionType } from '@bytebank/core'
import { TRANSACTION_TYPE_LABELS, formatMonthKey } from '@bytebank/utils'
import { useGetChartDataQuery } from '@/store/transactionsApi'

const COLORS = ['#004D61','#47A138','#FF5031','#0077A8','#7B5EA7','#F9A825','#F1823D']

const PERIODS: Array<{ value: PeriodInMonths; label: string }> = [
  { value: 3, label: '3 meses' },
  { value: 6, label: '6 meses' },
  { value: 'all', label: 'Tudo' },
]

const formatCurrency = (value: unknown) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export function CardCharts() {
  const [period, setPeriod] = useState<PeriodInMonths>('all')
  const [typeFilter, setTypeFilter] = useState<TransactionType | null>(null)
  const { data, isLoading, isError } = useGetChartDataQuery({ period, type: typeFilter ?? undefined })

  // No transactions at all. An empty period keeps the card: its buttons are the way out of it.
  if (data?.byType.length === 0 && period === 'all') return null

  const barData = data?.byMonth.map(({ monthKey, amountInCents }) => ({
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
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {PERIODS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-3 py-1 rounded-md text-meta transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900 ${
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
            onClick={() => setTypeFilter(null)}
            className="text-meta text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-900"
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
        <p className="text-body text-text-secondary">Carregando gráficos...</p>
      ) : pieData.length === 0 ? (
        <p className="text-body text-text-secondary">Nenhuma transação neste período</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1">
            <p className="text-meta-semibold text-primary-900 mb-3">Movimentação por mês (R$)</p>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData}>
                <XAxis dataKey="month" tick={{fontSize:11}} />
                <YAxis tick={{fontSize:11}} width={60} />
                <Tooltip formatter={formatCurrency} />
                <Bar dataKey="total" fill={COLORS[0]} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1">
            <p className="text-meta-semibold text-primary-900 mb-3">Distribuição por tipo</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  outerRadius={75}
                  dataKey="value"
                  activeShape={{ outerRadius: 88 }}
                  onClick={(_: unknown, index: number) => {
                    const type = pieData[index]?.type ?? null
                    setTypeFilter(prev => prev === type ? null : type)
                  }}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={entry.type}
                      fill={COLORS[i % COLORS.length]}
                      opacity={typeFilter && typeFilter !== entry.type ? 0.3 : 1}
                    />
                  ))}
                </Pie>
                <Legend />
                <Tooltip formatter={formatCurrency} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
