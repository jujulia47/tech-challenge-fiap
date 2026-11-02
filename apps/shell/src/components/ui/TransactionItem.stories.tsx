import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TransactionItem } from '@bytebank/design-system'

const deposit = { id: '1', userId: '1', type: 'deposit', amountInCents: 150000, date: '2026-03-08' } as const
const payment = { id: '2', userId: '1', type: 'payment', amountInCents: 35000, date: '2026-01-20' } as const
const exchange = { id: '3', userId: '1', type: 'currency_exchange', amountInCents: 42000, date: '2026-02-11' } as const

const meta: Meta<typeof TransactionItem> = {
  title: 'Design System/TransactionItem',
  component: TransactionItem,
  tags: ['autodocs'],
  decorators: [Story => <div className="max-w-sm bg-surface-card p-6 rounded-md"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component:
          'Uma linha do extrato: tipo, data e valor com sinal. Os botões só aparecem com o handler correspondente. `onActionIntent` avisa quando o ponteiro ou o foco chegam a um botão, para o modal daquela ação ser pré-carregado.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof TransactionItem>

export const Income: Story = {
  args: { transaction: deposit },
  parameters: {
    docs: { description: { story: 'Entrada, sem sinal e sem botões.' } },
  },
}

export const Expense: Story = {
  args: { transaction: payment },
  parameters: {
    docs: { description: { story: 'Saída, com o sinal de menos.' } },
  },
}

export const WithActions: Story = {
  args: {
    transaction: payment,
    onDetail: () => {},
    onEdit: () => {},
    onDelete: () => {},
  },
  parameters: {
    docs: { description: { story: 'Com os três botões, cada um com aria-label em português.' } },
  },
}

export const NarrowScreen: Story = {
  args: {
    transaction: exchange,
    showDivider: false,
    onDetail: () => {},
    onEdit: () => {},
    onDelete: () => {},
  },
  decorators: [Story => <div className="max-w-[200px]"><Story /></div>],
  parameters: {
    docs: { description: { story: 'Em largura pequena o tipo quebra a linha em vez de ser cortado.' } },
  },
}
