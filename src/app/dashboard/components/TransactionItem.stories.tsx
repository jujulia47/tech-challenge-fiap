import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { TransactionItem } from './TransactionItem'

const meta: Meta<typeof TransactionItem> = {
  title: 'Components/Cards/TransactionItem',
  component: TransactionItem,
  tags: ['autodocs'],
  decorators: [
    (Story) => (
      <div style={{ background: '#F5F5F5', padding: 24 }}>
        <Story />
      </div>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof TransactionItem>

export const Deposit: Story = {
  args: {
    id: '1',
    date: '18/11/2022',
    label: 'Depósito',
    amount: 'R$ 150,00',
    showDivider: true,
    onEdit: (id) => console.log('edit', id),
    onDelete: (id) => console.log('delete', id),
    onDetail: (id) => console.log('detail', id),
  },
}

export const Transfer: Story = {
  args: {
    id: '2',
    date: '21/11/2022',
    label: 'Transferência',
    amount: '-R$ 500,00',
    showDivider: false,
    onEdit: (id) => console.log('edit', id),
    onDelete: (id) => console.log('delete', id),
    onDetail: (id) => console.log('detail', id),
  },
}

export const WithoutActions: Story = {
  args: {
    id: '3',
    date: '05/12/2022',
    label: 'Pagamento',
    amount: '-R$ 80,00',
    showDivider: true,
  },
}
