import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, waitFor, within } from 'storybook/test'
import type { TransactionDTO } from '@bytebank/core'
import { Button, ModalEditTransaction, type TransactionEdit } from '@bytebank/design-system'

const payment: TransactionDTO = { id: 'story-2', userId: 'story', type: 'payment', amountInCents: 35000, date: '2026-01-20' }

interface EditStoryProps {
  transaction: TransactionDTO
  startOpen?: boolean
  onSave: (id: string, changes: TransactionEdit) => Promise<unknown>
  onSuccess: () => void
  onError: (message: string) => void
}

// A button opens the modal, so a story can show that the focus comes back to it. onSave stands
// for the store of the zone: it answers at once, with no request.
function EditStory({ transaction, startOpen = true, onSave, onSuccess, onError }: EditStoryProps) {
  const [open, setOpen] = useState<TransactionDTO | null>(startOpen ? transaction : null)
  return (
    <>
      <Button variant="primary" label="Editar transação" onClick={() => setOpen(transaction)} />
      <ModalEditTransaction transaction={open} onSave={onSave} onClose={() => setOpen(null)} onSuccess={onSuccess} onError={onError} />
    </>
  )
}

const meta: Meta<typeof EditStory> = {
  title: 'Design System/ModalEditTransaction',
  component: EditStory,
  tags: ['autodocs'],
  args: { transaction: payment, onSave: fn(async () => undefined), onSuccess: fn(), onError: fn() },
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Edição do tipo e do valor de uma transação, já preenchidos. A zona salva pelo seu store, recebido em `onSave`, e o design system não depende dele. Valor zerado ou tipo vazio dão "Preencha todos os campos"; uma falha ao salvar mantém o modal aberto, com a mensagem. Fecha com Escape ou no ×, e o foco volta a quem o abriu.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof EditStory>

export const Filled: Story = {
  parameters: { docs: { description: { story: 'Aberto com os dados da transação.' } } },
}

export const SaveFails: Story = {
  args: { onSave: fn(async () => Promise.reject(new Error('offline'))) },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: 'Salvar alterações' }))
    await expect(await canvas.findByRole('alert')).toHaveTextContent('Erro ao salvar alterações. Tente novamente.')
    await expect(args.onError).toHaveBeenCalledWith('Erro ao salvar alterações')
    // In the document, not toBeVisible: the modal of daisyUI fades in from opacity 0
    await expect(canvas.getByRole('dialog', { name: 'Editar transação' })).toBeInTheDocument()
  },
  parameters: { docs: { description: { story: 'O salvamento falha: o modal fica aberto, com o aviso.' } } },
}

export const SavesAndCloses: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await userEvent.click(await canvas.findByRole('button', { name: 'Salvar alterações' }))
    await expect(args.onSave).toHaveBeenCalledWith('story-2', { type: 'payment', amountInCents: 35000 })
    await waitFor(() => expect(args.onSuccess).toHaveBeenCalled())
    await expect(canvas.queryByRole('dialog', { name: 'Editar transação' })).toBeNull()
  },
  parameters: { docs: { description: { story: 'Salva com o tipo e o valor do formulário, fecha e avisa o sucesso.' } } },
}

export const EscapeGivesTheFocusBack: Story = {
  args: { startOpen: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const opener = canvas.getByRole('button', { name: 'Editar transação' })
    await userEvent.click(opener)
    const dialog = await canvas.findByRole('dialog', { name: 'Editar transação' })
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: 'Editar transação' })).toBeNull())
    await expect(opener).toHaveFocus()
  },
  parameters: { docs: { description: { story: 'Abre pelo botão, Escape fecha e o foco volta ao botão.' } } },
}
