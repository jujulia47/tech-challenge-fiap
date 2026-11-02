// Numbers for Recharts and classes for the skeleton: the two must match, or the page jumps
export const BAR_CHART_HEIGHT = 200
// With the row of type buttons, the column has the height of the skeleton
export const PIE_CHART_HEIGHT = 200

export const BAR_CHART_TITLE = 'Movimentação por mês (R$)'
export const PIE_CHART_TITLE = 'Distribuição por tipo'

export function ChartsSkeleton() {
  return (
    <div role="status" className="flex flex-col lg:flex-row gap-6">
      <span className="sr-only">Carregando gráficos...</span>
      <div aria-hidden="true" className="flex-1">
        <p className="text-meta-semibold text-primary-900 mb-3">{BAR_CHART_TITLE}</p>
        <div className="h-[200px] rounded-md bg-primary-50 motion-safe:animate-pulse" />
      </div>
      <div aria-hidden="true" className="flex-1">
        <p className="text-meta-semibold text-primary-900 mb-3">{PIE_CHART_TITLE}</p>
        <div className="h-[260px] rounded-md bg-primary-50 motion-safe:animate-pulse" />
      </div>
    </div>
  )
}
