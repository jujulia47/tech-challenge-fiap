import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ModalConfirmDelete } from './ModalConfirmDelete'

const meta: Meta<typeof ModalConfirmDelete> = {
  title: 'Design System/ModalConfirmDelete',
  component: ModalConfirmDelete,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Modal de confirmação exibido antes de ações destrutivas (atualmente usado para deletar transações). Bloqueia a ação até que o usuário confirme explicitamente, prevenindo deleções acidentais. Usa `Button variant="light"` para cancelar e `Button variant="error-outline"` para confirmar — a hierarquia visual reforça que cancelar é a ação segura/padrão.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ModalConfirmDelete>

export const Default: Story = {
  args: { isOpen: true, onClose: () => {}, onConfirm: () => {}, transactionLabel: 'Depósito' },
  parameters: {
    docs: {
      description: {
        story: 'Modal aberto com label da transação a ser excluída.',
      },
    },
  },
}

export const WithoutLabel: Story = {
  args: { isOpen: true, onClose: () => {}, onConfirm: () => {} },
  parameters: {
    docs: {
      description: {
        story: 'Modal aberto sem label específico — exibe descrição genérica.',
      },
    },
  },
}

export const Closed: Story = {
  args: { isOpen: false, onClose: () => {}, onConfirm: () => {} },
  parameters: {
    docs: {
      description: {
        story:
          'Estado fechado — o modal não renderiza nada visível. Útil para confirmar que o componente respeita a prop `isOpen`.',
      },
    },
  },
}
