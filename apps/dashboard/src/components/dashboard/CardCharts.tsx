'use client'
import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import type { Transaction } from '@/types/transaction'

interface Props {
  transactions: Transaction[]
}

const COLORS = ['#004D61','#47A138','#FF5031','#0077A8','#7B5EA7','#F9A825','#F1823D']

function parseBRL(amount: string): number {
  return parseFloat(
    amount.replace('R$','').replace(/\./g,'').replace(',','.').trim()
  ) || 0
}

export function CardCharts({ transactions }: Props) {
  const [periodFilter, setPeriodFilter] = useState<'3m' | '6m' | 'tudo'>('tudo')
  const [typeFilter, setTypeFilter] = useState<string | null>(null)

  if (!transactions.length) return null

  const today = new Date()
  const filteredByPeriod = transactions.filter(tx => {
    if (periodFilter === 'tudo') return true
    const months = periodFilter === '3m' ? 3 : 6
    const [day, month, year] = (tx.transactionDate ?? tx.date).split('/').map(Number)
    const txDate = new Date(year, month - 1, day)
    const cutoff = new Date(today.getFullYear(), today.getMonth() - months, today.getDate())
    return txDate >= cutoff
  })

  const byMonth: Record<string,number> = {}
  filteredByPeriod
    .filter(tx => !typeFilter || tx.label === typeFilter)
    .forEach(tx => {
      const m = tx.month ?? 'outros'
      byMonth[m] = (byMonth[m] ?? 0) + parseBRL(tx.amount)
    })

  const byType: Record<string,number> = {}
  filteredByPeriod.forEach(tx => {
    byType[tx.label] = (byType[tx.label] ?? 0) + parseBRL(tx.amount)
  })

  const barData = Object.entries(byMonth).map(([month,total]) => ({
    month: month.charAt(0).toUpperCase() + month.slice(1),
    total: parseFloat(total.toFixed(2))
  }))

  const pieData = Object.entries(byType).map(([name,value]) => ({
    name, value: parseFloat(value.toFixed(2))
  }))

  return (
    <div className="bg-surface-card rounded-md p-6 flex flex-col gap-6">
      <h2 className="text-heading font-bold text-text-primary">Análise financeira</h2>
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['3m', '6m', 'tudo'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriodFilter(p)}
              className={`px-3 py-1 rounded-md text-meta transition-colors ${
                periodFilter === p
                  ? 'bg-primary-900 text-inverse'
                  : 'bg-primary-50 text-primary-900 hover:opacity-80'
              }`}
            >
              {p === '3m' ? '3 meses' : p === '6m' ? '6 meses' : 'Tudo'}
            </button>
          ))}
        </div>
        {typeFilter && (
          <button
            onClick={() => setTypeFilter(null)}
            className="text-meta text-accent hover:underline"
          >
            Limpar filtro: {typeFilter} ×
          </button>
        )}
      </div>
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <p className="text-meta-semibold text-primary-900 mb-3">Movimentação por mês (R$)</p>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="month" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} width={60} />
              <Tooltip formatter={(v) =>
                Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} />
              <Bar dataKey="total" fill="#004D61" radius={[4,4,0,0]} />
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
                  const tipo = pieData[index]?.name
                  setTypeFilter(prev => prev === tipo ? null : tipo ?? null)
                }}
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={COLORS[i % COLORS.length]}
                    opacity={typeFilter && typeFilter !== entry.name ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Legend />
              <Tooltip formatter={(v) =>
                Number(v).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
