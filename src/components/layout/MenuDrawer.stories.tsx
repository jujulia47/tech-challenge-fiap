import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { userEvent, within } from 'storybook/test'
import { MenuDrawer } from './MenuDrawer'

const meta: Meta<typeof MenuDrawer> = {
  title: 'Components/Layout/MenuDrawer',
  component: MenuDrawer,
  parameters: { layout: 'fullscreen' },
  globals: {
    viewport: { value: 'mobile' },
  },
}

export default meta
type Story = StoryObj<typeof MenuDrawer>

export const Closed: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/dashboard' } },
  },
}

export const Open: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/dashboard' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = await canvas.findByLabelText('Abrir menu de navegação')
    await userEvent.click(trigger)
  },
}

export const OpenActiveStatement: Story = {
  parameters: {
    nextjs: { navigation: { pathname: '/dashboard/extrato' } },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = await canvas.findByLabelText('Abrir menu de navegação')
    await userEvent.click(trigger)
  },
}