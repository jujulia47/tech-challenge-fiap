import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CardAccount } from './CardAccount'

const meta: Meta<typeof CardAccount> = {
  title: 'Components/Cards/CardAccount',
  component: CardAccount,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof CardAccount>

export const Default: Story = {}
