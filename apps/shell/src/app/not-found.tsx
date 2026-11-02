import type { Metadata } from 'next'
import { NotFoundContent } from '@/components/layout/NotFoundContent'

export const metadata: Metadata = {
  title: 'Página não encontrada',
  description: 'A página que você procura não existe ou foi movida.',
}

export default function NotFound() {
  return <NotFoundContent />
}
