import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { ProfileMenu } from './ProfileMenu'

const dummyRef = { current: null } as React.RefObject<HTMLElement | null>

const meta: Meta<typeof ProfileMenu> = {
  title: 'Design System/ProfileMenu',
  component: ProfileMenu,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    backgrounds: {
      default: 'dark',
      values: [{ name: 'dark', value: '#004D61' }],
    },
    docs: {
      description: {
        component:
          'Menu dropdown que abre a partir do avatar no Header. Mostra as opções de perfil (Minha conta, Configurações, Sair) com o item ativo destacado em verde. Fecha ao clicar fora ou no `×`. É a única exceção permitida à regra de no-shadow do projeto — usa `shadow-lg` para se separar do fundo escuro do Header.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ProfileMenu>

export const Closed: Story = {
  args: { isOpen: false, onClose: () => {}, onLogout: () => {}, triggerRef: dummyRef },
  parameters: {
    docs: {
      description: {
        story: 'Estado fechado — não renderiza nada visível.',
      },
    },
  },
}

export const Open: Story = {
  args: { isOpen: true, onClose: () => {}, onLogout: () => {}, triggerRef: dummyRef },
  parameters: {
    nextjs: { navigation: { pathname: '/dashboard' } },
    docs: {
      description: {
        story: 'Menu aberto na rota /dashboard. Nenhum item ativo.',
      },
    },
  },
}

export const ActiveProfile: Story = {
  args: { isOpen: true, onClose: () => {}, onLogout: () => {}, triggerRef: dummyRef },
  parameters: {
    nextjs: { navigation: { pathname: '/dashboard/account' } },
    docs: {
      description: {
        story: "Menu aberto na rota /dashboard/account — apenas o item 'Minha conta' aparece destacado em verde semibold.",
      },
    },
  },
}
