import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CardStatement } from './CardStatement'
import { groupByMonth } from '@/lib/utils/transactions'
import type { Transaction } from '@/app/dashboard/types/transaction'

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', date: '28/04/2026', label: 'Pagamento',     amount: '-R$ 80,00',  month: 'abril'    },
  { id: '2', date: '05/12/2022', label: 'Depósito',      amount: 'R$ 200,00',  month: 'dezembro' },
  { id: '3', date: '21/11/2022', label: 'Transferência', amount: '-R$ 500,00', month: 'novembro' },
  { id: '4', date: '21/11/2022', label: 'Depósito',      amount: 'R$ 100,00',  month: 'novembro' },
  { id: '5', date: '18/11/2022', label: 'Depósito',      amount: 'R$ 150,00',  month: 'novembro' },
  { id: '6', date: '21/11/2022', label: 'Depósito',      amount: 'R$ 50,00',   month: 'novembro' },
]

const meta: Meta<typeof CardStatement> = {
  title: 'Components/Cards/CardStatement',
  component: CardStatement,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof CardStatement>

export const Default: Story = {
  args: {
    groups: groupByMonth(MOCK_TRANSACTIONS),
    onEdit: (id) => console.log('edit', id),
    onDelete: (id) => console.log('delete', id),
    onDetail: (id) => console.log('detail', id),
  },
}

export const Limited: Story = {
  args: {
    groups: groupByMonth(MOCK_TRANSACTIONS),
    limit: 4,
    showViewMore: true,
    onEdit: (id) => console.log('edit', id),
    onDelete: (id) => console.log('delete', id),
    onDetail: (id) => console.log('detail', id),
  },
}

export const Empty: Story = {
  args: { groups: [] },
}
