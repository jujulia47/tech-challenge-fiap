import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import { MenuDrawer } from '@bytebank/design-system'
import { NAV_ITEMS } from './navigationStoryItems'

const meta: Meta<typeof MenuDrawer> = {
  title: 'Design System/MenuDrawer',
  component: MenuDrawer,
  tags: ['autodocs'],
  args: { items: NAV_ITEMS },
  // Only below md: on a wider screen the drawer is hidden and the tabs or the sidebar take its place
  globals: { viewport: { value: 'mobile' } },
  decorators: [Story => <div className="bg-primary-900 p-4"><Story /></div>],
  parameters: {
    nextjs: { navigation: { pathname: '/investments' } },
    docs: {
      description: {
        component:
          'Menu das zonas em telas pequenas: o botão abre uma gaveta com `role="dialog"`, que recebe o foco, prende o Tab e fecha com Escape, no fundo escurecido ou num item. O item da página atual fica em destaque.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof MenuDrawer>

export const Closed: Story = {
  parameters: {
    docs: { description: { story: 'Fechado: só o botão, com `aria-expanded="false"`.' } },
  },
}

export const OpenAndCloseWithEscape: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const opener = canvas.getByRole('button', { name: 'Abrir menu de navegação' })
    await userEvent.click(opener)

    const drawer = canvas.getByRole('dialog', { name: 'Menu de navegação' })
    await expect(opener).toHaveAttribute('aria-expanded', 'true')
    await waitFor(() => expect(drawer).toContainElement(document.activeElement as HTMLElement))
    await expect(canvas.getByRole('link', { name: 'Investimentos' })).toHaveClass('text-nav-bold')

    await userEvent.keyboard('{Escape}')
    await expect(opener).toHaveAttribute('aria-expanded', 'false')
    await expect(drawer).toHaveAttribute('aria-hidden', 'true')
    await waitFor(() => expect(opener).toHaveFocus())
  },
  parameters: {
    docs: { description: { story: 'Abre, o foco entra na gaveta, "Investimentos" aparece como página atual, e Escape fecha e devolve o foco ao botão.' } },
  },
}
