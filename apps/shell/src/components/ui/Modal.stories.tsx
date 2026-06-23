import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Modal } from './Modal'
import { Input } from './Input'
import { Button } from './Button'

const meta: Meta<typeof Modal> = {
  title: 'Design System/Modal',
  component: Modal,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Componente primitivo para todos os modais do projeto. Renderiza overlay + painel centralizado com título padronizado e botão de fechar opcional. Centraliza comportamento (ESC, click no backdrop) e acessibilidade (role=dialog, aria-labelledby). O conteúdo do corpo é responsabilidade do chamador via children.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Modal>

export const Default: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: 'Título do modal',
    children: <p className="text-body text-text-primary mt-4">Conteúdo do modal vai aqui.</p>,
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal aberto com título e conteúdo simples.',
      },
    },
  },
}

export const WithoutCloseButton: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: 'Confirmar ação',
    showCloseButton: false,
    children: <p className="text-body text-text-primary mt-4">Você tem certeza que deseja continuar?</p>,
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal sem botão ×. Usado quando o usuário deve fazer uma escolha explícita (ex: ModalConfirmDelete).',
      },
    },
  },
}

export const WithForm: Story = {
  args: {
    isOpen: true,
    onClose: () => {},
    title: 'Formulário',
    children: (
      <form className="flex flex-col gap-4 mt-6">
        <Input label="Nome" value="" onChange={() => {}} placeholder="Seu nome" />
        <Button label="Enviar" variant="success" />
      </form>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Modal contendo um formulário — uso típico em login/cadastro/edição.',
      },
    },
  },
}

export const Closed: Story = {
  args: {
    isOpen: false,
    onClose: () => {},
    title: 'X',
    children: null,
  },
  parameters: {
    docs: {
      description: {
        story: 'Estado fechado — o componente retorna null e nada é renderizado.',
      },
    },
  },
}
