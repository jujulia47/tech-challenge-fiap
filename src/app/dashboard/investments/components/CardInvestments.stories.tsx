import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CardInvestments } from './CardInvestments'

const meta: Meta<typeof CardInvestments> = {
  title: 'Components/Cards/CardInvestments',
  component: CardInvestments,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof CardInvestments>

export const Default: Story = {}
