export interface ChunkSlot<T> {
  current: () => T
  renew: () => void
}

// React.lazy keeps a failure forever, so trying again needs a new lazy component
export function createChunkSlot<T>(create: () => T): ChunkSlot<T> {
  let current = create()

  return {
    current: () => current,
    renew: () => {
      current = create()
    },
  }
}
