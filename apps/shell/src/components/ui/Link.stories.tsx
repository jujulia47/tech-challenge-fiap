import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { Link } from './Link'

const meta: Meta<typeof Link> = {
  title: 'Design System/Link',
  component: Link,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'Link textual inline. Centraliza a regra de cor por contexto (app → verde / public → laranja) e tamanho (body / meta). Usado para links auxiliares dentro de formulários, breadcrumbs simples, e CTAs textuais. Para navegação estrutural (menus, cards inteiros, botões wrapped), use next/link diretamente.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof Link>

export const AppBody: Story = {
  args: { href: '#', context: 'app', size: 'body', children: 'Ver extrato completo →' },
  parameters: {
    docs: {
      description: {
        story: 'Contexto app, tamanho body. Verde, 16px.',
      },
    },
  },
}

export const AppMeta: Story = {
  args: { href: '#', context: 'app', size: 'meta', children: 'Saiba mais' },
  parameters: {
    docs: {
      description: {
        story: 'Contexto app, tamanho meta. Verde, 13px — para links auxiliares secundários.',
      },
    },
  },
}

export const PublicBody: Story = {
  args: { href: '#', context: 'public', size: 'body', children: 'Voltar ao início' },
  parameters: {
    docs: {
      description: {
        story: 'Contexto public, tamanho body. Verde do landing (#3AB44A) — variante do verde principal usada em links e CTAs do contexto público.',
      },
    },
  },
}

export const PublicMeta: Story = {
  args: { href: '#', context: 'public', size: 'meta', children: 'Esqueci a senha' },
  parameters: {
    docs: {
      description: {
        story: "Contexto public, tamanho meta. Verde do landing aplicado a links auxiliares dentro de modais públicos (ex: 'Esqueci a senha' no ModalLogin).",
      },
    },
  },
}
