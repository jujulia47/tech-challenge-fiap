import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Design System/Button',
  component: Button,
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'light', 'accent', 'outline', 'success', 'error-outline'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = {
  args: { variant: 'primary', label: 'Confirmar' },
}

export const Accent: Story = {
  args: { variant: 'accent', label: 'Concluir transação' },
}

export const Success: Story = {
  args: { variant: 'success', label: 'Salvar alterações' },
}

export const ErrorOutline: Story = {
  args: { variant: 'error-outline', label: 'Bloquear' },
}

export const Light: Story = {
  args: { variant: 'light', label: 'Cancelar' },
}

export const Outline: Story = {
  args: { variant: 'outline', label: 'Já tenho conta' },
}

export const Disabled: Story = {
  args: { variant: 'primary', label: 'Desabilitado', disabled: true },
}