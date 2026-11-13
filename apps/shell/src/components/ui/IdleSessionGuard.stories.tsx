import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import { IdleSessionGuard, type IdleSessionServices } from '@bytebank/design-system'
import { withSession } from './storySession'

// Short times, so the warning comes 2 s after the story opens. The session would end only after
// 2 minutes with no "Continuar conectado", and here ending it only calls a spy: no logout, no
// navigation and no request.
const SERVICES: IdleSessionServices = {
  loadPolicy: async () => ({ idleTimeoutSeconds: 120, idleWarningSeconds: 118, updateAgeSeconds: 300 }),
  renew: fn(),
  expire: fn(),
}

const meta: Meta<typeof IdleSessionGuard> = {
  title: 'Design System/IdleSessionGuard',
  component: IdleSessionGuard,
  tags: ['autodocs'],
  args: { services: SERVICES },
  decorators: [withSession],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Logout por inatividade das zonas. Sem atividade, um `alertdialog` avisa com a contagem regressiva, e "Continuar conectado" renova a sessão. Durante o aviso só o botão conta como atividade. A contagem visível fica escondida dos leitores de tela, que ouvem só os 30 e os 10 segundos finais. Os tempos vêm do shell em produção; aqui, `services` dá tempos curtos e nenhuma chamada de rede.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof IdleSessionGuard>

export const WarningAndContinue: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const warning = await canvas.findByRole('alertdialog', { name: 'Sua sessão vai expirar' }, { timeout: 8000 })
    // In the document, not toBeVisible: the modal of daisyUI fades in from opacity 0
    await expect(within(warning).getByText(/Tempo restante: \d+ s/)).toBeInTheDocument()
    await waitFor(() => expect(within(warning).getByRole('button', { name: 'Continuar conectado' })).toHaveFocus())

    await userEvent.click(within(warning).getByRole('button', { name: 'Continuar conectado' }))
    await waitFor(() => expect(canvas.queryByRole('alertdialog')).toBeNull())
    await expect(SERVICES.renew).toHaveBeenCalled()
    await expect(SERVICES.expire).not.toHaveBeenCalled()
  },
  parameters: {
    docs: { description: { story: 'O aviso aparece com a contagem e o foco no botão. "Continuar conectado" fecha o aviso e renova a sessão, sem sair.' } },
  },
}
