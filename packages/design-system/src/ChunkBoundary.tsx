'use client'

import { Component, type ReactNode } from 'react'
import { Button } from './Button'

interface ChunkBoundaryProps {
  fallback: ReactNode
  children: ReactNode
}

interface ChunkBoundaryState {
  failed: boolean
}

// Keeps a chunk that failed to download from taking the rest of the page down with it
export class ChunkBoundary extends Component<ChunkBoundaryProps, ChunkBoundaryState> {
  state: ChunkBoundaryState = { failed: false }

  static getDerivedStateFromError(): ChunkBoundaryState {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

interface ChunkFailureProps {
  onRetry: () => void
}

export function ChunkFailure({ onRetry }: ChunkFailureProps) {
  return (
    <div role="alert" aria-live="polite" className="flex flex-col items-start gap-4">
      <p className="text-body text-error">Não foi possível carregar esta parte.</p>
      <Button variant="primary" label="Tentar novamente" onClick={onRetry} />
    </div>
  )
}
