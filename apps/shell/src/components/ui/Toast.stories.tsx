// src/components/ui/Toast.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Toast } from './Toast'

const meta: Meta<typeof Toast> = {
  title: 'Design System/Toast',
  component: Toast,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component:
          'Toast de feedback exibido no canto inferior esquerdo (`fixed bottom-6 left-6 z-50`). Aparece após ações assíncronas (criar, editar, deletar transação) e desaparece automaticamente após 3 segundos. A escolha por bottom-left evita colisão com elementos de UI tipicamente posicionados à direita (chat widgets, FABs, botões scroll-to-top).',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Toast>

export const Success: Story = {
  args: { message: 'Transação adicionada com sucesso', type: 'success', visible: true },
}

export const Error: Story = {
  args: { message: 'Erro ao excluir transação', type: 'error', visible: true },
}

export const Hidden: Story = {
  args: { message: 'Invisível', type: 'success', visible: false },
}

export const Positioned: Story = {
  args: { message: 'Transação criada com sucesso', type: 'success', visible: true },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        story:
          'Demonstra o posicionamento real do Toast em viewport completo. O componente aparece no canto inferior esquerdo, sobreposto ao conteúdo da página.',
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="min-h-screen bg-bg-base relative">
        <Story />
      </div>
    ),
  ],
}
