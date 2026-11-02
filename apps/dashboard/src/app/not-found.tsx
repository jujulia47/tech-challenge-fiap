import type { Metadata } from 'next'
import { NotFoundMessage } from '@bytebank/design-system'

export const metadata: Metadata = {
  title: 'Página não encontrada',
  description: 'A página que você procura não existe ou foi movida.',
}

export default function NotFound() {
  return <NotFoundMessage homeHref="/" homeLabel="Voltar ao dashboard" />
}
