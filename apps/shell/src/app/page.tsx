import { PublicShell } from '@/components/layout/PublicShell'
import { Footer } from '@/components/layout/Footer'
import { HeroSection } from '@/app/(public)/components/HeroSection'
import { BenefitsSection } from '@/app/(public)/components/BenefitsSection'

export default function LandingPage() {
  return (
    <div className="landing-gradient min-h-screen flex flex-col">
      <PublicShell>
        <main className="flex-1">
          <HeroSection />
          <BenefitsSection />
        </main>
        <Footer />
      </PublicShell>
    </div>
  )
}
