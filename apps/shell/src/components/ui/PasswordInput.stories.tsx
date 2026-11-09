import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, within } from 'storybook/test'
import { PasswordInput } from '@bytebank/design-system'

type PasswordInputProps = React.ComponentProps<typeof PasswordInput>

function Controlled(props: PasswordInputProps) {
  const [value, setValue] = useState(props.value)
  return <PasswordInput {...props} value={value} onChange={setValue} />
}

const meta: Meta<typeof PasswordInput> = {
  title: 'Design System/PasswordInput',
  component: PasswordInput,
  tags: ['autodocs'],
  render: args => <Controlled {...args} />,
  decorators: [Story => <div className="max-w-sm"><Story /></div>],
  args: { label: 'Senha', value: '', onChange: () => {} },
  parameters: {
    docs: {
      description: {
        component:
          'Campo para digitar uma senha que já existe, no login e na senha atual: só o botão de mostrar e ocultar, sem indicador de força nem critérios. Usa `autocomplete="current-password"`, para o gerenciador de senhas preencher. O `PasswordField`, de senha nova, usa este campo por dentro.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PasswordInput>

export const Empty: Story = {}

export const Toggle: Story = {
  args: { value: 'minha senha atual' },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const field = canvas.getByLabelText('Senha')
    await expect(field).toHaveAttribute('type', 'password')
    await expect(field).toHaveAttribute('autocomplete', 'current-password')

    await userEvent.click(canvas.getByRole('button', { name: 'Mostrar senha' }))
    await expect(field).toHaveAttribute('type', 'text')
    const hide = canvas.getByRole('button', { name: 'Ocultar senha' })
    await expect(hide).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(hide)
    await expect(field).toHaveAttribute('type', 'password')
    await expect(canvas.getByRole('button', { name: 'Mostrar senha' })).toHaveAttribute('aria-pressed', 'false')
  },
  parameters: {
    docs: { description: { story: 'O botão mostra a senha, troca o rótulo para "Ocultar senha" e marca `aria-pressed`. Um segundo clique esconde de novo.' } },
  },
}

export const WithError: Story = {
  args: { label: 'Senha atual', value: 'senha digitada', error: 'Senha atual incorreta' },
  parameters: {
    docs: { description: { story: 'O erro fica embaixo, com `role="alert"`, como nos outros campos.' } },
  },
}
