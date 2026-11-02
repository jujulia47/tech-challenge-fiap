import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { PasswordField } from '@bytebank/design-system'

type PasswordFieldProps = React.ComponentProps<typeof PasswordField>

function Controlled(props: PasswordFieldProps) {
  const [value, setValue] = useState(props.value)
  return <PasswordField {...props} value={value} onChange={setValue} />
}

const meta: Meta<typeof PasswordField> = {
  title: 'Design System/PasswordField',
  component: PasswordField,
  tags: ['autodocs'],
  render: args => <Controlled {...args} />,
  decorators: [Story => <div className="max-w-sm"><Story /></div>],
  args: { label: 'Senha', value: '', onChange: () => {} },
  parameters: {
    docs: {
      description: {
        component:
          'Campo para criar uma senha, com a política do NIST: indicador de força, critérios visíveis e botão para mostrar ou ocultar. Colar é permitido, e `autocomplete="new-password"` deixa o gerenciador de senhas sugerir uma. A força é anunciada só quando o nível muda.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof PasswordField>

export const Empty: Story = {
  parameters: {
    docs: { description: { story: 'Vazio: critérios neutros e indicador zerado.' } },
  },
}

export const TooShort: Story = {
  args: { value: 'abc123' },
  parameters: {
    docs: { description: { story: 'Abaixo do mínimo: o critério de tamanho fica em vermelho.' } },
  },
}

export const Strong: Story = {
  args: { value: 'cavalo bateria grampo correto' },
  parameters: {
    docs: { description: { story: 'Uma frase longa: força máxima, sem exigir símbolos.' } },
  },
}

export const WithPersonalContext: Story = {
  args: {
    value: 'joana.silva.2026',
    context: { name: 'Joana Silva', email: 'joana@exemplo.com' },
  },
  parameters: {
    docs: { description: { story: 'A senha contém o nome de quem cadastra: o critério pessoal falha.' } },
  },
}

export const RefusedAsCommon: Story = {
  args: { value: 'uma-senha-recusada', refusedAsCommon: true },
  parameters: {
    docs: { description: { story: 'O servidor recusou a senha por ser comum: o critério aparece em vermelho.' } },
  },
}
