// src/components/ui/Select.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { userEvent, within } from 'storybook/test'
import { Select } from './Select'
import { useState, type ComponentProps } from 'react'

const OPTIONS = [
  { value: 'deposito',      label: 'Depósito' },
  { value: 'saque',         label: 'Saque' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'pagamento',     label: 'Pagamento' },
]

const meta: Meta<typeof Select> = {
  title: 'Design System/Select',
  component: Select,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Select>

const SelectWithState = (args: ComponentProps<typeof Select>) => {
  const [value, setValue] = useState(args.value ?? '')
  return <Select {...args} value={value} onChange={setValue} />
}

export const Default: Story = {
  render: (args) => <SelectWithState {...args} />,
  args: { placeholder: 'Selecione o tipo de transação', options: OPTIONS },
}

export const WithLabel: Story = {
  render: (args) => <SelectWithState {...args} />,
  args: { label: 'Tipo de transação', placeholder: 'Selecione...', options: OPTIONS },
}

export const WithSelectedValue: Story = {
  render: (args) => <SelectWithState {...args} />,
  args: { placeholder: 'Selecione...', options: OPTIONS, value: 'deposito' },
}

export const Open: Story = {
  render: (args) => <SelectWithState {...args} />,
  args: { label: 'Tipo de transação', placeholder: 'Selecione...', options: OPTIONS },
  parameters: {
    docs: {
      description: {
        story:
          'Estado aberto do dropdown — painel expandido com a lista de opções visível. O trigger ganha `border-success` e o ícone gira para `arrow_drop_up`. Clique fora do componente fecha o painel.',
      },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = await canvas.findByRole('button')
    await userEvent.click(trigger)
  },
}