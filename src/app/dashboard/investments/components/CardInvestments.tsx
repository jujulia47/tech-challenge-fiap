const MONTHLY_RETURN = {
  percentage: 2.3,
  amount: 'R$ 1.150,00',
}

const RECENT_CONTRIBUTIONS = [
  { id: '1', date: '10/04/2026', label: 'Aporte — Renda Fixa',     amount: 'R$ 500,00' },
  { id: '2', date: '01/04/2026', label: 'Aporte — Tesouro Direto', amount: 'R$ 300,00' },
  { id: '3', date: '15/03/2026', label: 'Aporte — Renda Variável', amount: 'R$ 200,00' },
]

const INVESTMENT_GOAL = {
  label: 'Meta anual',
  current: 50000,
  target: 120000,
}

const INVESTMENT_TYPES = [
  { label: 'Renda Fixa',     value: 'R$ 36.000,00' },
  { label: 'Renda Variável', value: 'R$ 14.000,00' },
]

const CHART_SEGMENTS = [
  { pct: 0.40, colorClass: 'stroke-chart-blue',   dotClass: 'bg-chart-blue',   label: 'Fundos de investimento' },
  { pct: 0.25, colorClass: 'stroke-chart-purple',  dotClass: 'bg-chart-purple', label: 'Tesouro Direto'         },
  { pct: 0.20, colorClass: 'stroke-chart-pink',    dotClass: 'bg-chart-pink',   label: 'Previdência Privada'    },
  { pct: 0.15, colorClass: 'stroke-chart-orange',  dotClass: 'bg-chart-orange', label: 'Bolsa de Valores'       },
]

const r = 50
const CX = 63
const CY = 63
const circumference = 2 * Math.PI * r

function buildArcs() {
  let cumulative = 0
  return CHART_SEGMENTS.map((seg) => {
    const length = seg.pct * circumference
    const dashoffset = circumference - cumulative
    cumulative += length
    return { ...seg, length, dashoffset }
  })
}

const ARCS = buildArcs()

export function CardInvestments() {
  return (
    <div className="relative bg-surface-form rounded-md p-6 overflow-hidden">
      <h2 className="text-heading text-text-primary">Investimentos</h2>
      <p className="text-heading font-normal text-success mt-1 mb-6">Total: R$ 50.000,00</p>

      <ul className="grid grid-cols-2 gap-3 mb-6">
        {INVESTMENT_TYPES.map((item) => (
          <li key={item.label} className="bg-primary-900 rounded-md p-4 flex flex-col gap-1">
            <span className="text-body text-primary-50">{item.label}</span>
            <span className="text-label font-normal text-inverse">{item.value}</span>
          </li>
        ))}
      </ul>

      <p className="text-label text-text-primary mb-3">Estatísticas</p>
      <div className="bg-primary-900 rounded-md p-4">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <svg
            width="126"
            height="126"
            viewBox="0 0 126 126"
            aria-hidden="true"
            className="shrink-0"
          >
            <circle
              cx={CX}
              cy={CY}
              r={r}
              fill="none"
              strokeWidth="22"
              className="stroke-primary-800"
            />
            {ARCS.map((arc) => (
              <circle
                key={arc.label}
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                strokeWidth="22"
                strokeDasharray={`${arc.length} ${circumference}`}
                strokeDashoffset={arc.dashoffset}
                strokeLinecap="butt"
                transform={`rotate(-90 ${CX} ${CY})`}
                className={arc.colorClass}
              />
            ))}
          </svg>

          <div className="flex flex-col gap-2">
            {CHART_SEGMENTS.map((seg) => (
              <div key={seg.label} className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.dotClass}`} />
                <span className="text-body text-inverse">{seg.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-primary-900 rounded-md p-4 mt-6">
        <p className="text-body text-primary-50 mb-1">Rentabilidade do mês</p>
        <div className="flex items-center gap-3">
          <span className="material-icons text-success text-icon-sm">trending_up</span>
          <p className="text-heading font-normal text-success">
            +{MONTHLY_RETURN.percentage}%
          </p>
          <p className="text-body text-primary-50">{MONTHLY_RETURN.amount}</p>
        </div>
      </div>

      <div className="mt-6">
        <p className="text-label text-text-primary mb-4">Últimos aportes</p>
        <ul className="flex flex-col gap-3">
          {RECENT_CONTRIBUTIONS.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 border-b border-success">
              <div className="flex flex-col gap-1">
                <span className="text-body text-text-primary">{item.label}</span>
                <span className="text-meta text-text-secondary">{item.date}</span>
              </div>
              <span className="text-body-semibold text-success shrink-0">{item.amount}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-label text-text-primary">{INVESTMENT_GOAL.label}</p>
          <span className="text-meta text-text-secondary">
            {Math.round((INVESTMENT_GOAL.current / INVESTMENT_GOAL.target) * 100)}%
          </span>
        </div>
        <div className="h-2 bg-surface-form rounded-md overflow-hidden">
          <div
            className="h-full bg-success rounded-md transition-all"
            style={{ width: `${Math.round((INVESTMENT_GOAL.current / INVESTMENT_GOAL.target) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-meta text-text-secondary">
            R$ {INVESTMENT_GOAL.current.toLocaleString('pt-BR')}
          </span>
          <span className="text-meta text-text-secondary">
            R$ {INVESTMENT_GOAL.target.toLocaleString('pt-BR')}
          </span>
        </div>
      </div>
    </div>
  )
}
