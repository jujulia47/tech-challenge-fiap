// src/components/ui/Input.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Input } from './Input'
import { useState, type ComponentProps } from 'react'

const meta: Meta<typeof Input> = {
  title: 'Design System/Input',
  component: Input,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Input>

const InputWithState = (args: ComponentProps<typeof Input>) => {
  const [value, setValue] = useState(args.value ?? '')
  return <Input {...args} value={value} onChange={setValue} />
}

export const Default: Story = {
  render: (args) => <InputWithState {...args} />,
  args: { label: 'Nome completo', placeholder: 'Joana da Silva' },
}

export const Email: Story = {
  render: (args) => <InputWithState {...args} />,
  args: { label: 'E-mail', type: 'email', placeholder: 'seu@email.com' },
}

export const Password: Story = {
  render: (args) => <InputWithState {...args} />,
  args: { label: 'Senha', type: 'password', placeholder: '••••••••' },
}

export const WithError: Story = {
  render: (args) => <InputWithState {...args} />,
  args: { label: 'E-mail', type: 'email', placeholder: 'seu@email.com', error: 'E-mail inválido' },
}

export const Disabled: Story = {
  render: (args) => <InputWithState {...args} />,
  args: { label: 'Campo desabilitado', placeholder: 'Não editável', disabled: true },
}

export const WithSuffixIcon: Story = {
  render: (args) => <InputWithState {...args} />,
  args: { label: 'Nome', placeholder: 'Joana da Silva', suffixIcon: 'edit' },
}