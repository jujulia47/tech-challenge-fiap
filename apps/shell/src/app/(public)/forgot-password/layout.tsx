import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Esqueci a senha',
  description: 'Receba por e-mail um link para redefinir a senha da sua conta do Bytebank.',
}

// The page is a Client Component, which cannot export metadata
export default function Layout({ children }: { children: React.ReactNode }) {
  return children
}
