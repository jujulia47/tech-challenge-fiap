import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, userEvent, waitFor, within } from 'storybook/test'
import type { TransactionDTO } from '@bytebank/core'
import { Button, ModalTransactionDetail } from '@bytebank/design-system'

// A 1x1 image and an empty PDF, made up for the stories: no real attachment
const IMAGE = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
const PDF = 'data:application/pdf;base64,JVBERi0xLjQKJSVFT0YK'
const deposit: TransactionDTO = { id: 'story-1', userId: 'story', type: 'deposit', amountInCents: 150000, date: '2026-03-08' }

interface DetailStoryProps {
  transaction: TransactionDTO
  startOpen?: boolean
}

// A button opens the modal, so a story can show that the focus comes back to it
function DetailStory({ transaction, startOpen = true }: DetailStoryProps) {
  const [open, setOpen] = useState<TransactionDTO | null>(startOpen ? transaction : null)
  return (
    <>
      <Button variant="primary" label="Ver detalhes" onClick={() => setOpen(transaction)} />
      <ModalTransactionDetail transaction={open} onClose={() => setOpen(null)} />
    </>
  )
}

const meta: Meta<typeof DetailStory> = {
  title: 'Design System/ModalTransactionDetail',
  component: DetailStory,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'Detalhes de uma transação: tipo, data, mês de referência e valor com sinal. Uma imagem anexada aparece em miniatura e um PDF como botão; os dois abrem o visualizador, carregado só na intenção. Um anexo que não pôde ser lido aparece como "Anexo indisponível". Fecha com Escape, no × ou em "Fechar", e o foco volta a quem o abriu.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof DetailStory>

export const WithoutAttachment: Story = {
  args: { transaction: deposit },
  parameters: { docs: { description: { story: 'Sem anexo.' } } },
}

export const WithImage: Story = {
  args: { transaction: { ...deposit, type: 'payment', amountInCents: 35000, attachment: IMAGE } },
  parameters: { docs: { description: { story: 'Uma saída com uma imagem anexada: a miniatura abre o visualizador.' } } },
}

export const WithPdf: Story = {
  args: { transaction: { ...deposit, attachment: PDF } },
  parameters: { docs: { description: { story: 'Um PDF anexado: um botão em vez da miniatura.' } } },
}

export const AttachmentUnavailable: Story = {
  args: { transaction: { ...deposit, attachmentUnavailable: true } },
  parameters: { docs: { description: { story: 'O anexo não pôde ser decifrado: a transação aparece, com o aviso no lugar dele.' } } },
}

export const EscapeGivesTheFocusBack: Story = {
  args: { transaction: deposit, startOpen: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const opener = canvas.getByRole('button', { name: 'Ver detalhes' })
    await userEvent.click(opener)
    const dialog = await canvas.findByRole('dialog', { name: 'Detalhes da transação' })
    await waitFor(() => expect(dialog).toContainElement(document.activeElement as HTMLElement))

    await userEvent.keyboard('{Escape}')
    await waitFor(() => expect(canvas.queryByRole('dialog', { name: 'Detalhes da transação' })).toBeNull())
    await expect(opener).toHaveFocus()
  },
  parameters: { docs: { description: { story: 'Abre pelo botão, o foco entra no modal, Escape fecha e o foco volta ao botão.' } } },
}
