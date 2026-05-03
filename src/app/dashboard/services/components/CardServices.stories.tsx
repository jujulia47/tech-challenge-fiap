import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { CardServices } from './CardServices'

const meta: Meta<typeof CardServices> = {
  title: 'Components/Cards/CardServices',
  component: CardServices,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof CardServices>

export const Default: Story = {}
