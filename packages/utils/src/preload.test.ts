import { describe, expect, it, vi } from 'vitest'
import { onIntent, preloadable } from './preload'

const settle = () => new Promise(resolve => setTimeout(resolve, 0))

describe('preloadable', () => {
  it('does not load before it is asked to', () => {
    const loader = vi.fn(async () => 'chunk')

    preloadable(loader)

    expect(loader).not.toHaveBeenCalled()
  })

  it('downloads once, however many times the intent repeats', async () => {
    const loader = vi.fn(async () => 'chunk')
    const chunk = preloadable(loader)

    chunk.preload()
    chunk.preload()

    expect(await chunk.load()).toBe('chunk')
    expect(loader).toHaveBeenCalledTimes(1)
  })

  it('does not leave a failed preload unhandled', async () => {
    const chunk = preloadable(() => Promise.reject(new Error('offline')))
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)

    chunk.preload()
    await settle()

    process.off('unhandledRejection', unhandled)
    expect(unhandled).not.toHaveBeenCalled()
  })

  it('tries again after a failure, and the real load reports it', async () => {
    const loader = vi.fn<() => Promise<string>>()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce('chunk')
    const chunk = preloadable(loader)

    await expect(chunk.load()).rejects.toThrow('offline')

    expect(await chunk.load()).toBe('chunk')
    expect(loader).toHaveBeenCalledTimes(2)
  })
})

describe('onIntent', () => {
  it.each(['onPointerEnter', 'onFocus'] as const)('calls the action on %s', handler => {
    const action = vi.fn()

    onIntent(action)[handler]()

    expect(action).toHaveBeenCalledTimes(1)
  })
})
