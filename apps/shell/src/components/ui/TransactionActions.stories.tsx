import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, within } from 'storybook/test'
import type { TransactionDTO } from '@bytebank/core'
import { TransactionActions, TransactionItem, type TransactionEdit } from '@bytebank/design-system'

const deposit: TransactionDTO = { id: 'story-1', userId: 'story', type: 'deposit', amountInCents: 150000, date: '2026-03-08' }
const payment: TransactionDTO = { id: 'story-2', userId: 'story', type: 'payment', amountInCents: 35000, date: '2026-01-20' }

interface ActionsStoryProps {
  remove: (id: string) => Promise<unknown>
  save: (id: string, changes: TransactionEdit) => Promise<unknown>
}

// The list of a zone, with its actions. remove and save stand for its store: no request.
function ActionsStory({ remove, save }: ActionsStoryProps) {
  return (
    <TransactionActions transactions={[deposit, payment]} remove={remove} save={save}>
      {({ actions }) => (
        <div className="max-w-sm bg-surface-card p-6 rounded-md">
          <TransactionItem transaction={deposit} {...actions} showDivider />
          <TransactionItem transaction={payment} {...actions} />
        </div>
      )}
    </TransactionActions>
  )
}

const meta: Meta<typeof ActionsStory> = {
  title: 'Design System/TransactionActions',
  component: ActionsStory,
  tags: ['autodocs'],
  args: { remove: fn(async () => undefined), save: fn(async () => undefined) },
  parameters: {
    docs: {
      description: {
        component:
          'As ações de uma transação, iguais nas duas zonas: detalhes, editar e excluir, com os três modais carregados sob demanda e o toast. A página recebe por render prop as ações para a sua lista e o `showToast`; a exclusão e o salvamento vêm do store da zona, por `remove` e `save`. Os modais sob demanda não carregam no Storybook (docs/fase4/testing.md): abrir, salvar e excluir são testados no navegador, nas duas zonas.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof ActionsStory>

export const List: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    // Every item gets the three actions from the component
    await expect(canvas.getAllByRole('button', { name: 'Ver detalhes' })).toHaveLength(2)
    await expect(canvas.getAllByRole('button', { name: 'Editar transação' })).toHaveLength(2)
    await expect(canvas.getAllByRole('button', { name: 'Excluir transação' })).toHaveLength(2)
    await expect(args.remove).not.toHaveBeenCalled()
  },
  parameters: { docs: { description: { story: 'Uma lista com as ações dadas pelo componente a cada item.' } } },
}
