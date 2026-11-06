import type { TransactionRepository } from '@bytebank/core'
import {
  AesGcmCipher,
  CryptoIdGenerator,
  EncryptedAttachmentRepository,
  HttpTransactionRepository,
  SaoPauloClock,
  type AttachmentLogger,
} from '@bytebank/infrastructure'
import { createUseCases, type UseCases } from './createUseCases'

export interface StoredUseCasesOptions {
  // Raw, from any backend: the attachments are encrypted here, the same way for all of them
  transactions: TransactionRepository
  attachmentKey: string
  logger?: AttachmentLogger
}

export function createStoredUseCases({ transactions, attachmentKey, logger }: StoredUseCasesOptions): UseCases {
  return createUseCases({
    repository: new EncryptedAttachmentRepository(transactions, AesGcmCipher.fromBase64(attachmentKey), logger),
    clock: new SaoPauloClock(),
    idGenerator: new CryptoIdGenerator(),
  })
}

export interface JsonServerUseCasesOptions {
  baseUrl: string
  attachmentKey: string
  timeoutMs?: number
  logger?: AttachmentLogger
}

export function createJsonServerUseCases({
  baseUrl,
  attachmentKey,
  timeoutMs,
  logger,
}: JsonServerUseCasesOptions): UseCases {
  return createStoredUseCases({
    transactions: new HttpTransactionRepository(baseUrl, { timeoutMs }),
    attachmentKey,
    logger,
  })
}
