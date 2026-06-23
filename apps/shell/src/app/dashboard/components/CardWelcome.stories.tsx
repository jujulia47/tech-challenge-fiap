import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CardWelcome } from './CardWelcome'

const meta: Meta<typeof CardWelcome> = {
  title: 'Components/Cards/CardWelcome',
  component: CardWelcome,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof CardWelcome>

export const Default: Story = {
  args: {
    name: 'Joana',
    date: 'terça-feira, 29/04/2026',
    balance: 'R$ 2.500,00',
    accountType: 'Conta Corrente',
  },
}

export const BalanceHidden: Story = {
  args: {
    name: 'Joana',
    date: 'terça-feira, 29/04/2026',
    balance: 'R$ 2.500,00',
    accountType: 'Conta Corrente',
  },
}

export const LongName: Story = {
  args: {
    name: 'Bartholomeu',
    date: 'terça-feira, 29/04/2026',
    balance: 'R$ 10.250,00',
    accountType: 'Conta Corrente',
  },
}
