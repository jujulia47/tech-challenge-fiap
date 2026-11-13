import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { NotFoundMessage } from '@bytebank/design-system'

const meta: Meta<typeof NotFoundMessage> = {
  title: 'Design System/NotFoundMessage',
  component: NotFoundMessage,
  tags: ['autodocs'],
  decorators: [Story => <div className="bg-bg-base p-6"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component:
          'O conteúdo da página 404 das três apps: título, explicação e um link para o início. Quando o início está em outra zona, `external` faz o link recarregar a página.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof NotFoundMessage>

export const InTheZone: Story = {
  args: { homeHref: '/', homeLabel: 'Voltar ao painel' },
  parameters: {
    docs: { description: { story: 'O início é a raiz da própria zona: navegação sem recarregar.' } },
  },
}

export const InAnotherZone: Story = {
  args: { homeHref: '/dashboard', homeLabel: 'Voltar ao painel', external: true },
  parameters: {
    docs: { description: { story: 'O início está em outra zona, então o link recarrega a página.' } },
  },
}
