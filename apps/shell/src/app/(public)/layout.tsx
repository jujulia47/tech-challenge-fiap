import { Footer } from '@/components/layout/Footer'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-inverse min-h-screen flex flex-col">
      {children}
      <Footer />
    </div>
  )
}
