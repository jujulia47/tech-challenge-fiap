import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { userEvent, within } from 'storybook/test'
import { Header } from '@bytebank/design-system'
import type { NavItem } from '@bytebank/design-system'

const NAV_ITEMS: readonly NavItem[] = [
  { label: 'Início',          href: '/' },
  { label: 'Transações',      href: '/transactions', external: true },
  { label: 'Investimentos',   href: '/investments' },
  { label: 'Outros serviços', href: '/services' },
]

const meta: Meta<typeof Header> = {
  title: 'Design System/Header',
  component: Header,
  tags: ['autodocs'],
  args: { navItems: NAV_ITEMS },
  parameters: {
    layout: 'fullscreen',
    nextjs: { navigation: { pathname: '/' } },
    docs: {
      description: {
        component:
          'Cabeçalho das zonas, com o menu de perfil e o modal de sair. Os itens de navegação vêm por prop, porque os caminhos mudam com o basePath de cada zona: um item `external` é outra zona e navega com recarga da página.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Header>

export const Default: Story = {}

export const MobileMenuOpen: Story = {
  globals: { viewport: { value: 'mobile' } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByLabelText('Abrir menu de navegação'))
  },
  parameters: {
    docs: { description: { story: 'Em telas pequenas, o menu fica na gaveta, que recebe o foco ao abrir.' } },
  },
}
