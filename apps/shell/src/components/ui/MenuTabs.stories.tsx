import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'
import { MenuTabs } from '@bytebank/design-system'
import { NAV_ITEMS } from './navigationStoryItems'

const meta: Meta<typeof MenuTabs> = {
  title: 'Design System/MenuTabs',
  component: MenuTabs,
  tags: ['autodocs'],
  args: { items: NAV_ITEMS },
  // Only between md and lg: the drawer below it, the sidebar above it
  globals: { viewport: { value: 'tablet' } },
  parameters: {
    docs: {
      description: {
        component:
          'Menu das zonas em tablets: os itens lado a lado, numa lista de links. O item da página atual fica em negrito e sublinhado em verde.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof MenuTabs>

export const HomeActive: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/' } },
    docs: { description: { story: 'Na raiz da zona, "Início" é o item ativo.' } },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link', { name: 'Início' })).toHaveClass('text-nav-bold')
  },
}

export const ServicesActive: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/services' } },
    docs: { description: { story: 'Em "Outros serviços", só ele fica em destaque.' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('link', { name: 'Outros serviços' })).toHaveClass('text-nav-bold')
    await expect(canvas.getByRole('link', { name: 'Início' })).not.toHaveClass('text-nav-bold')
  },
}
