import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Meus cartões',
  description: 'Consulte seus cartões físicos e digitais e a fatura atual.',
}

// The page is a Client Component, which cannot export metadata
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
