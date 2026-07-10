'use client'
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
  console.log('CardCharts transactions:', transactions.length)

  if (!transactions.length) return null

  const byMonth: Record<string,number> = {}
  const byType: Record<string,number> = {}

  transactions.forEach(tx => {
    const m = tx.month ?? 'outros'
    byMonth[m] = (byMonth[m] ?? 0) + parseBRL(tx.amount)
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
    <div className="bg-surface-card rounded-none p-6 flex flex-col gap-6">
      <h2 className="text-heading font-bold text-text-primary">Análise financeira</h2>
      <div>
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
      <div>
        <p className="text-meta-semibold text-primary-900 mb-3">Distribuição por tipo</p>
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="45%"
              outerRadius={90}
              dataKey="value"
            >
              {pieData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
