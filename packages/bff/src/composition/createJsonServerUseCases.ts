import { CryptoIdGenerator, HttpTransactionRepository, SaoPauloClock } from '@bytebank/infrastructure'
import { createUseCases, type UseCases } from './createUseCases'

export interface JsonServerUseCasesOptions {
  baseUrl: string
  timeoutMs?: number
}

export function createJsonServerUseCases({ baseUrl, timeoutMs }: JsonServerUseCasesOptions): UseCases {
  return createUseCases({
    repository: new HttpTransactionRepository(baseUrl, { timeoutMs }),
    clock: new SaoPauloClock(),
    idGenerator: new CryptoIdGenerator(),
  })
}
