'use client'

import { createElement, useState, type ComponentType, type ReactNode } from 'react'
import dynamic from 'next/dynamic'
import type { Preloadable } from '@bytebank/utils'
import { ChunkBoundary, ChunkFailure } from './ChunkBoundary'
import { createChunkSlot } from './chunkSlot'
import { Modal } from './Modal'
import { MountOnceOpen } from './MountOnceOpen'

function useChunkPart<P extends object>(chunk: Preloadable<ComponentType<P>>, loading?: () => ReactNode) {
  const [slot] = useState(() => createChunkSlot(() => dynamic(chunk.load, { ssr: false, loading })))
  const [attempt, setAttempt] = useState(0)

  function retry() {
    slot.renew()
    setAttempt(current => current + 1)
  }

  // The key clears the failure held by the boundary
  return { Part: slot.current(), attempt, retry }
}

// A part of a page, such as the charts. A failure stays in its place, and the page goes on.
export function lazyPart<P extends object>(chunk: Preloadable<ComponentType<P>>, loading?: () => ReactNode) {
  return function LazyPart(props: P) {
    const { Part, attempt, retry } = useChunkPart(chunk, loading)

    return (
      <ChunkBoundary key={attempt} fallback={<ChunkFailure onRetry={retry} />}>
        {createElement(Part, props)}
      </ChunkBoundary>
    )
  }
}

// Downloads when it first opens. A failure opens in a modal, because the part that
// should appear is the modal itself: on the page, the message could be out of sight.
export function lazyModal<P extends { onClose: () => void }>(
  chunk: Preloadable<ComponentType<P>>,
  isOpen: (props: P) => boolean,
) {
  return function LazyModal(props: P) {
    const { Part, attempt, retry } = useChunkPart(chunk)
    const open = isOpen(props)

    return (
      <MountOnceOpen isOpen={open}>
        <ChunkBoundary
          key={attempt}
          fallback={
            <Modal isOpen={open} onClose={props.onClose} title="Erro ao abrir">
              <div className="mt-6">
                <ChunkFailure onRetry={retry} />
              </div>
            </Modal>
          }
        >
          {createElement(Part, props)}
        </ChunkBoundary>
      </MountOnceOpen>
    )
  }
}
