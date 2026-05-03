import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CardBill } from './CardBill'

const FISICO_DATA = {
  currentBill: 'R$ 1.250,00',
  dueDate: '15/05/2026',
  totalLimit: 'R$ 5.000,00',
  availableLimit: 'R$ 3.750,00',
  transactions: [
    { id: '1', date: '28/04/2026', label: 'Supermercado Extra', amount: '-R$ 320,00' },
    { id: '2', date: '25/04/2026', label: 'Posto de gasolina',  amount: '-R$ 180,00' },
    { id: '3', date: '20/04/2026', label: 'Restaurante',        amount: '-R$ 95,00'  },
  ],
}

const DIGITAL_DATA = {
  currentBill: 'R$ 320,00',
  dueDate: '15/05/2026',
  totalLimit: 'R$ 2.000,00',
  availableLimit: 'R$ 1.680,00',
  transactions: [
    { id: '1', date: '27/04/2026', label: 'Netflix',        amount: '-R$ 55,90' },
    { id: '2', date: '22/04/2026', label: 'Spotify',        amount: '-R$ 21,90' },
    { id: '3', date: '18/04/2026', label: 'iCloud Storage', amount: '-R$ 4,90'  },
  ],
}

const meta: Meta<typeof CardBill> = {
  title: 'Components/Cards/CardBill',
  component: CardBill,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof CardBill>

export const PhysicalCard: Story = {
  args: { data: FISICO_DATA, cardLabel: 'Cartão Físico' },
}

export const DigitalCard: Story = {
  args: { data: DIGITAL_DATA, cardLabel: 'Cartão Digital' },
}
