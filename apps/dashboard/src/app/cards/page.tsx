'use client'

import { useState } from 'react'
import { CardMyCards } from '@/app/cards/components/CardMyCards'
import { CardBill } from '@/app/cards/components/CardBill'
import { DashboardWelcome } from '@/components/layout/DashboardWelcome'

const BILL_DATA = {
  fisico: {
    currentBill: 'R$ 1.250,00',
    dueDate: '15/05/2026',
    totalLimit: 'R$ 5.000,00',
    availableLimit: 'R$ 3.750,00',
    transactions: [
      { id: '1', date: '28/04/2026', label: 'Supermercado Extra',    amount: '-R$ 320,00' },
      { id: '2', date: '25/04/2026', label: 'Posto de gasolina',     amount: '-R$ 180,00' },
      { id: '3', date: '20/04/2026', label: 'Restaurante',           amount: '-R$ 95,00'  },
      { id: '4', date: '15/04/2026', label: 'Farmácia',              amount: '-R$ 45,00'  },
    ],
  },
  digital: {
    currentBill: 'R$ 320,00',
    dueDate: '15/05/2026',
    totalLimit: 'R$ 2.000,00',
    availableLimit: 'R$ 1.680,00',
    transactions: [
      { id: '1', date: '27/04/2026', label: 'Netflix',               amount: '-R$ 55,90'  },
      { id: '2', date: '22/04/2026', label: 'Spotify',               amount: '-R$ 21,90'  },
      { id: '3', date: '18/04/2026', label: 'iCloud Storage',        amount: '-R$ 4,90'   },
    ],
  },
}

const CARD_LABELS = {
  fisico: 'Cartão Físico',
  digital: 'Cartão Digital',
}

export default function CardsPage() {
  const [selectedCard, setSelectedCard] = useState<'fisico' | 'digital'>('fisico')

  return (
    <div className="flex flex-col gap-4 lg:gap-6">
      <DashboardWelcome />
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2 lg:gap-6">
        <CardMyCards
          selectedCard={selectedCard}
          onCardSelect={setSelectedCard}
        />
        <CardBill
          data={BILL_DATA[selectedCard]}
          cardLabel={CARD_LABELS[selectedCard]}
        />
      </div>
    </div>
  )
}
