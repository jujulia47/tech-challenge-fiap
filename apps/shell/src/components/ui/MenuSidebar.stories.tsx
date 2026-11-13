import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, within } from 'storybook/test'
import { MenuSidebar } from '@bytebank/design-system'
import { NAV_ITEMS } from './navigationStoryItems'

const meta: Meta<typeof MenuSidebar> = {
  title: 'Design System/MenuSidebar',
  component: MenuSidebar,
  tags: ['autodocs'],
  args: { items: NAV_ITEMS },
  // Only from lg: below it the tabs or the drawer take its place
  globals: { viewport: { value: 'desktop' } },
  decorators: [Story => <div className="flex h-80 bg-bg-base p-6"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component:
          'Menu lateral das zonas em telas grandes, numa lista de links. O item da página atual fica em destaque, em negrito e verde. Um item `external` é outra zona e navega com recarga da página.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof MenuSidebar>

export const HomeActive: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/' } },
    docs: { description: { story: 'Na raiz da zona, "Início" é o item ativo.' } },
  },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole('link', { name: 'Início' })).toHaveClass('font-bold')
  },
}

export const InnerPageActive: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/investments/fundos' } },
    docs: { description: { story: 'Uma página dentro de "Investimentos" também o deixa ativo, e "Início" não.' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('link', { name: 'Investimentos' })).toHaveClass('font-bold')
    await expect(canvas.getByRole('link', { name: 'Início' })).not.toHaveClass('font-bold')
  },
}
