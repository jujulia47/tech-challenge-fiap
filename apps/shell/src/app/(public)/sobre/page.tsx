import { Metadata } from 'next'
import { PublicShell } from '@/components/layout/PublicShell'

export const metadata: Metadata = {
  title: 'Sobre o Bytebank',
  description: 'Conheça o Bytebank, seu banco digital moderno.',
}

export const revalidate = 3600

async function getStats() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'}/transactions`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return { total: 0, types: [] as string[] }
    const transactions = await res.json()
    const types = [...new Set(transactions.map((t: { label: string }) => t.label))] as string[]
    return { total: transactions.length, types }
  } catch {
    return { total: 0, types: [] as string[] }
  }
}

export default async function AboutPage() {
  const stats = await getStats()
  return (
    <PublicShell>
      <main className="max-w-[800px] mx-auto px-6 py-12 flex flex-col gap-8">
        <section>
          <h1 className="text-display font-bold text-primary-900 mb-4">Sobre o Bytebank</h1>
          <p className="text-body text-text-secondary leading-relaxed">
            O Bytebank é um banco digital moderno, desenvolvido para oferecer uma
            experiência financeira simples, rápida e segura.
          </p>
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
