const benefits = [
  {
    icon: 'devices',
    title: 'Conta gratuita',
    description: 'Abra sua conta sem tarifas de manutenção e sem burocracias.',
  },
  {
    icon: 'trending_up',
    title: 'Saques gratuitos',
    description: 'Saque seu dinheiro sem tarifas em qualquer terminal.',
  },
  {
    icon: 'swap_horiz',
    title: 'Transferências',
    description: 'Transfira para qualquer banco sem custos adicionais.',
  },
  {
    icon: 'savings',
    title: 'Rendimento',
    description: 'Seu dinheiro rendendo automaticamente sem você precisar fazer nada.',
  },
]

export function BenefitsSection() {
  return (
    <section id="servicos" className="px-6 md:px-page-tablet py-16">
      <h2 className="text-heading text-text-primary mb-8 text-center">
        Vantagens do nosso banco
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {benefits.map((item) => (
          <div
            key={item.title}
            className="flex flex-col items-center gap-4 p-6 bg-inverse rounded-md"
          >
            <span className="material-icons text-icon-md text-public-accent">
              {item.icon}
            </span>
            <h3 className="text-body-semibold text-text-primary text-center">
              {item.title}
            </h3>
            <p className="text-body text-text-secondary text-center">
              {item.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
