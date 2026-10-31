import { Metadata } from 'next'
import { isTransactionType } from '@bytebank/core'
import { TRANSACTION_TYPE_LABELS } from '@bytebank/utils'
import { PublicShell } from '@/components/layout/PublicShell'

export const metadata: Metadata = {
  title: 'Sobre o Bytebank',
  description: 'Conheça o Bytebank, seu banco digital moderno.',
}

// Read on each request: the build has no json-server, and it would freeze a page without the numbers
export const dynamic = 'force-dynamic'

const NO_STATS = { total: 0, types: [] as string[] }

async function getStats() {
  const baseUrl = process.env.JSON_SERVER_URL
  if (!baseUrl) return NO_STATS
  try {
    const res = await fetch(`${baseUrl}/transactions`)
    if (!res.ok) return NO_STATS
    const transactions = (await res.json()) as Array<{ type: string }>
    const types = [...new Set(transactions.map(t => t.type))]
      .filter(isTransactionType)
      .map(type => TRANSACTION_TYPE_LABELS[type])
    return { total: transactions.length, types }
  } catch {
    return NO_STATS
  }
}

export default async function AboutPage() {
  const stats = await getStats()
  return (
    <PublicShell>
      <main className="max-w-[800px] mx-auto px-6 py-12 flex flex-col gap-8 flex-1">
        <section>
          <h1 className="text-display font-bold text-primary-900 mb-4">Sobre o Bytebank</h1>
          <p className="text-body text-text-secondary leading-relaxed">
            O Bytebank é um banco digital moderno, desenvolvido para oferecer uma
            experiência financeira simples, rápida e segura.
          </p>
          <p className="text-meta text-text-secondary italic">
            * As informações desta página são fictícias e criadas para fins de demonstração.
          </p>
        </section>
        <section className="flex flex-col gap-3">
          <h2 className="text-heading font-bold text-text-primary">Nossa missão</h2>
          <p className="text-body text-text-secondary leading-relaxed">
            Democratizar o acesso a serviços financeiros de qualidade, oferecendo
            tecnologia de ponta com a simplicidade que nossos clientes merecem.
          </p>
        </section>
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-surface-card rounded-md p-4 flex flex-col gap-1 text-center">
            <span className="text-display font-bold text-primary-900">500k+</span>
            <span className="text-meta text-text-secondary">Clientes ativos</span>
          </div>
          <div className="bg-surface-card rounded-md p-4 flex flex-col gap-1 text-center">
            <span className="text-display font-bold text-primary-900">R$2bi+</span>
            <span className="text-meta text-text-secondary">Transacionados</span>
          </div>
          <div className="bg-surface-card rounded-md p-4 flex flex-col gap-1 text-center">
            <span className="text-display font-bold text-primary-900">99.9%</span>
            <span className="text-meta text-text-secondary">Disponibilidade</span>
          </div>
          <div className="bg-surface-card rounded-md p-4 flex flex-col gap-1 text-center">
            <span className="text-display font-bold text-primary-900">4.8★</span>
            <span className="text-meta text-text-secondary">Avaliação média</span>
          </div>
        </section>
        {stats.total > 0 && (
          <section className="bg-surface-card rounded-md p-6 flex flex-col gap-4">
            <h2 className="text-heading font-bold text-text-primary">Em números</h2>
            <p className="text-body text-text-secondary">
              Total de transações: <strong className="text-primary-900">{stats.total}</strong>
            </p>
            <p className="text-body text-text-secondary">
              Tipos disponíveis: <strong className="text-primary-900">{stats.types.join(', ')}</strong>
            </p>
          </section>
        )}
      </main>
    </PublicShell>
  )
}
