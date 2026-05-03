// src/components/ui/Checkbox.stories.tsx
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Checkbox } from './Checkbox'
import { useState, type ComponentProps } from 'react'

const meta: Meta<typeof Checkbox> = {
  title: 'Design System/Checkbox',
  component: Checkbox,
  tags: ['autodocs'],
}

export default meta
type Story = StoryObj<typeof Checkbox>

const CheckboxWithState = (args: ComponentProps<typeof Checkbox>) => {
  const [checked, setChecked] = useState(args.checked ?? false)
  return <Checkbox {...args} checked={checked} onChange={setChecked} />
}

export const Unchecked: Story = {
  render: (args) => <CheckboxWithState {...args} />,
  args: { label: 'Aceito os termos de uso e política de privacidade' },
}

export const Checked: Story = {
  render: (args) => <CheckboxWithState {...args} />,
  args: { label: 'Aceito os termos de uso e política de privacidade', checked: true },
}

export const WithError: Story = {
  render: (args) => <CheckboxWithState {...args} />,
  args: {
    label: 'Aceito os termos de uso e política de privacidade',
    error: 'Aceite os termos para continuar',
  },
}