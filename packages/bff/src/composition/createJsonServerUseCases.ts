import {
  AesGcmCipher,
  CryptoIdGenerator,
  EncryptedAttachmentRepository,
  HttpTransactionRepository,
  SaoPauloClock,
  type AttachmentLogger,
} from '@bytebank/infrastructure'
import { createUseCases, type UseCases } from './createUseCases'

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
  return createUseCases({
    repository: new EncryptedAttachmentRepository(
      new HttpTransactionRepository(baseUrl, { timeoutMs }),
      AesGcmCipher.fromBase64(attachmentKey),
      logger,
    ),
    clock: new SaoPauloClock(),
    idGenerator: new CryptoIdGenerator(),
  })
}
