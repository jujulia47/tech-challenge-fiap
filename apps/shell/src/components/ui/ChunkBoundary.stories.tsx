import type { Meta, StoryObj } from '@storybook/nextjs-vite'
import { expect, fn, userEvent, within } from 'storybook/test'
import { ChunkBoundary, ChunkFailure } from '@bytebank/design-system'

interface BoundaryStoryProps {
  onRetry: () => void
}

// Stands for a part of the page whose chunk failed to download
function FailedChunk(): never {
  throw new Error('Loading chunk failed')
}

function BoundaryStory({ onRetry }: BoundaryStoryProps) {
  return (
    <div className="flex flex-col gap-6">
      <p className="text-body text-text-primary">O resto da página continua no ar.</p>
      <ChunkBoundary fallback={<ChunkFailure onRetry={onRetry} />}>
        <FailedChunk />
      </ChunkBoundary>
    </div>
  )
}

const meta: Meta<typeof BoundaryStory> = {
  title: 'Design System/ChunkBoundary',
  component: BoundaryStory,
  tags: ['autodocs'],
  args: { onRetry: fn() },
  decorators: [Story => <div className="max-w-md bg-surface-card p-6 rounded-md"><Story /></div>],
  parameters: {
    docs: {
      description: {
        component:
          'Error boundary das partes carregadas sob demanda (gráficos e modais, por `lazyPart` e `lazyModal`). Quando o download de uma parte falha, só ela é trocada pelo aviso, com `role="alert"`, e "Tentar novamente" pede o arquivo de novo. O resto da página continua funcionando.',
      },
    },
  },
}

export default meta
type Story = StoryObj<typeof BoundaryStory>

export const FailedAndRetry: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole('alert')).toHaveTextContent('Não foi possível carregar esta parte.')
    await expect(canvas.getByText('O resto da página continua no ar.')).toBeVisible()

    await userEvent.click(canvas.getByRole('button', { name: 'Tentar novamente' }))
    await expect(args.onRetry).toHaveBeenCalledTimes(1)
  },
  parameters: {
    docs: { description: { story: 'A parte falhou: o aviso aparece no lugar dela, e "Tentar novamente" chama a nova tentativa.' } },
  },
}
