import type { TransactionPrimitives } from '../domain/transaction/Transaction'

// What use cases return. Presentation only ever sees primitives, never entities.
export type TransactionDTO = TransactionPrimitives
