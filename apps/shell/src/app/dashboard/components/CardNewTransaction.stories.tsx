import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CardNewTransaction } from './CardNewTransaction'
import { TransactionsContext } from '@/app/dashboard/context/TransactionsContext'
import type { Transaction } from '@/app/dashboard/types/transaction'

const mockContext = {
  transactions: [] as Transaction[],
  loading: false,
  addTransaction: async () => {},
  editTransaction: async () => {},
  deleteTransaction: async () => {},
}

const meta: Meta<typeof CardNewTransaction> = {
  title: 'Components/Cards/CardNewTransaction',
  component: CardNewTransaction,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <TransactionsContext.Provider value={mockContext}>
        <Story />
      </TransactionsContext.Provider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof CardNewTransaction>

export const Default: Story = {
  args: {
    onSuccess: (msg) => console.log('success', msg),
    onError: (msg) => console.log('error', msg),
  },
}
