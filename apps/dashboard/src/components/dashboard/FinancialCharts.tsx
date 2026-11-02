'use client'

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts'
import type { TransactionType } from '@bytebank/core'
import {
  BAR_CHART_HEIGHT,
  BAR_CHART_TITLE,
  PIE_CHART_HEIGHT,
  PIE_CHART_TITLE,
} from '@/components/dashboard/ChartsSkeleton'

const COLORS = ['#004D61','#47A138','#FF5031','#0077A8','#7B5EA7','#F9A825','#F1823D']

const formatCurrency = (value: unknown) =>
  Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

interface FinancialChartsProps {
  barData: Array<{ axisLabel: string; month: string; total: number }>
  pieData: Array<{ type: TransactionType; name: string; value: number }>
  typeFilter: TransactionType | null
  onTypeClick: (type: TransactionType | null) => void
}

export function FinancialCharts({ barData, pieData, typeFilter, onTypeClick }: FinancialChartsProps) {
  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* The drawing is hidden from screen readers: the table in each figure says the same in words */}
      <figure className="flex-1 min-w-0">
        <figcaption className="text-meta-semibold text-primary-900 mb-3">{BAR_CHART_TITLE}</figcaption>
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={BAR_CHART_HEIGHT}>
            <BarChart data={barData} accessibilityLayer={false}>
              <XAxis dataKey="axisLabel" tick={{fontSize:11}} interval={0} />
              <YAxis tick={{fontSize:11}} width={60} />
              <Tooltip
                formatter={formatCurrency}
                labelFormatter={(label, payload) => payload[0]?.payload?.month ?? label}
              />
              <Bar dataKey="total" fill={COLORS[0]} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <table className="sr-only">
          <thead>
            <tr>
              <th scope="col">Mês</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            {barData.map(({ month, total }) => (
              <tr key={month}>
                <th scope="row">{month}</th>
                <td>{formatCurrency(total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
      <figure className="flex-1 min-w-0">
        <figcaption className="text-meta-semibold text-primary-900 mb-3">{PIE_CHART_TITLE}</figcaption>
        <div aria-hidden="true">
          <ResponsiveContainer width="100%" height={PIE_CHART_HEIGHT}>
            <PieChart accessibilityLayer={false}>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                outerRadius={75}
                dataKey="value"
                rootTabIndex={-1}
                activeShape={{ outerRadius: 88 }}
                onClick={(_: unknown, index: number) => onTypeClick(pieData[index]?.type ?? null)}
              >
                {pieData.map((entry, i) => (
                  <Cell
                    key={entry.type}
                    fill={COLORS[i % COLORS.length]}
                    opacity={typeFilter && typeFilter !== entry.type ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip formatter={formatCurrency} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="flex flex-wrap justify-center content-start gap-x-3 gap-y-1 min-h-[60px]">
          {pieData.map(({ type, name }, i) => (
            <li key={type}>
              <button
                type="button"
                aria-pressed={typeFilter === type}
                onClick={() => onTypeClick(type)}
                className={`flex items-center gap-2 min-h-7 px-2 rounded-md text-meta text-text-primary hover:bg-primary-50 ${typeFilter === type ? 'font-semibold underline' : ''}`}
              >
                <svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" fill={COLORS[i % COLORS.length]} /></svg>
                {name}
              </button>
            </li>
          ))}
        </ul>
        <table className="sr-only">
          <thead>
            <tr>
              <th scope="col">Tipo</th>
              <th scope="col">Valor</th>
            </tr>
          </thead>
          <tbody>
            {pieData.map(({ type, name, value }) => (
              <tr key={type}>
                <th scope="row">{name}</th>
                <td>{formatCurrency(value)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </figure>
    </div>
  )
}
