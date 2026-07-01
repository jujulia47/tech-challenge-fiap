import Link from 'next/link'

const SERVICES = [
  { id: 'emprestimo',      label: 'Empréstimo',       icon: 'account_balance_wallet', href: '/coming-soon' },
  { id: 'meus-cartoes',    label: 'Meus cartões',      icon: 'credit_card',            href: '/cards' },
  { id: 'doacoes',         label: 'Doações',           icon: 'volunteer_activism',     href: '/coming-soon' },
  { id: 'pix',             label: 'Pix',               icon: 'qr_code',                href: '/coming-soon' },
  { id: 'seguros',         label: 'Seguros',           icon: 'security',               href: '/coming-soon' },
  { id: 'credito-celular', label: 'Crédito celular',   icon: 'smartphone',             href: '/coming-soon' },
  { id: 'investimentos',   label: 'Investimentos',     icon: 'trending_up',            href: '/investments' },
  { id: 'extrato',         label: 'Extrato completo',  icon: 'receipt_long',           href: '/statement' },
  { id: 'cambio',          label: 'Câmbio de moeda',   icon: 'currency_exchange',      href: '/coming-soon' },
]

const baseClass = 'flex flex-col items-center gap-2 rounded-md p-4 transition-all bg-surface-card border-2 border-transparent'

export function CardServices() {
  return (
    <div className="relative bg-surface-form rounded-md p-6 overflow-hidden">
      <h2 className="text-heading text-primary-50 mb-6">
        Confira os serviços disponíveis
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {SERVICES.map((service) => (
          <Link
            key={service.id}
            href={service.href}
            className={baseClass}
          >
            <span className="material-icons text-icon-md text-success">{service.icon}</span>
            <span className="text-body-semibold text-text-primary text-center">{service.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}
