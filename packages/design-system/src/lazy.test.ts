import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { preloadable } from '@bytebank/utils'
import { describe, expect, it, vi } from 'vitest'
import { ChunkBoundary, ChunkFailure } from './ChunkBoundary'
import { createChunkSlot } from './chunkSlot'

describe('createChunkSlot', () => {
  it('keeps the same lazy component until a retry', () => {
    const create = vi.fn(() => ({}))
    const slot = createChunkSlot(create)

    expect(slot.current()).toBe(slot.current())
    expect(create).toHaveBeenCalledTimes(1)
  })

  it('makes a new one on a retry, because React.lazy keeps a failure forever', () => {
    const slot = createChunkSlot(() => ({}))
    const failed = slot.current()

    slot.renew()

    expect(slot.current()).not.toBe(failed)
  })

  it('downloads again on a retry, and gets the chunk when the network is back', async () => {
    const loader = vi.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('Failed to load chunk'))
      .mockResolvedValueOnce('chunk')
    const chunk = preloadable(loader)
    const slot = createChunkSlot(() => chunk.load)

    await expect(slot.current()()).rejects.toThrow('Failed to load chunk')
    slot.renew()

    expect(await slot.current()()).toBe('chunk')
    expect(loader).toHaveBeenCalledTimes(2)
  })
})

describe('ChunkBoundary', () => {
  const boundary = (failed: boolean) => {
    const instance = new ChunkBoundary({ fallback: 'falha', children: 'parte' })
    instance.state = { failed }
    return instance.render()
  }

  it('shows the part while nothing fails', () => {
    expect(boundary(false)).toBe('parte')
  })

  it('shows the fallback after an error, in place of the part', () => {
    expect(ChunkBoundary.getDerivedStateFromError()).toEqual({ failed: true })
    expect(boundary(true)).toBe('falha')
  })
})

describe('ChunkFailure', () => {
  it('announces the failure and offers another attempt', () => {
    const html = renderToStaticMarkup(createElement(ChunkFailure, { onRetry: vi.fn() }))

    expect(html).toContain('role="alert"')
    expect(html).toContain('Não foi possível carregar esta parte.')
    expect(html).toContain('Tentar novamente')
  })
})
