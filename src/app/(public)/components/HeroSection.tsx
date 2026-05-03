'use client'

import { usePublicModal } from '@/components/layout/PublicShell'

export function HeroSection() {
  const { openLogin, openSignup } = usePublicModal()

  return (
    <section className="px-6 md:px-page-tablet py-16 relative overflow-hidden">
      <div className="max-w-card-md">
        <h1 className="text-heading text-inverse mb-4">
          Experimente mais liberdade no que fazer com o seu dinheiro.
        </h1>
        <p className="text-body text-inverse mb-8">
          Com o ByteBank você decide como utilizar o seu dinheiro com mais
          segurança, rapidez e sempre com muito byteismo.
        </p>
        <div className="flex flex-col gap-4 md:flex-row">
          <button
            type="button"
            onClick={openSignup}
            className="h-12 px-6 rounded-md border text-body-semibold bg-public-accent text-inverse border-public-accent hover:opacity-90 active:scale-95 transition-all"
          >
            Abrir minha conta
          </button>
          <button
            type="button"
            onClick={openLogin}
            className="h-12 px-6 rounded-md border text-body-semibold bg-primary-900 text-public-accent border-public-accent hover:opacity-90 active:scale-95 transition-all"
          >
            Já tenho conta
          </button>
        </div>
      </div>

      {/* Decorative illustration placeholder — desktop only */}
      <div
        className="absolute top-0 right-0 hidden lg:block w-64 h-full"
        aria-hidden="true"
      >
        <div className="w-full h-full bg-inverse opacity-5 rounded-md" />
      </div>
    </section>
  )
}
