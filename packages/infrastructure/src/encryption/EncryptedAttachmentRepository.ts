import { Transaction, type DataCipher, type TransactionRepository } from '@bytebank/core'
import { InfrastructureError } from '../errors/InfrastructureError'

const DATA_URL = /^data:([a-z]+\/[\w.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/
const SEPARATOR = 0x0a

// The file itself is sealed, not its data URL: base64 over base64 would be a third larger,
// and an attachment of 70 KB would no longer fit in the 102400 bytes of json-server
function toBytes(dataUrl: string): Buffer {
  const match = DATA_URL.exec(dataUrl)
  if (!match) throw new InfrastructureError('Attachment is not a base64 data URL', { code: 'UNREADABLE_DATA' })
  return Buffer.concat([Buffer.from(match[1]), Buffer.from([SEPARATOR]), Buffer.from(match[2], 'base64')])
}

function toDataUrl(bytes: Uint8Array): string {
  const buffer = Buffer.from(bytes)
  const end = buffer.indexOf(SEPARATOR)
  return `data:${buffer.subarray(0, end).toString()};base64,${buffer.subarray(end + 1).toString('base64')}`
}

function withAttachment(transaction: Transaction, attachment: string | undefined): Transaction {
  return Transaction.fromPrimitives({ ...transaction.toPrimitives(), attachment, attachmentUnavailable: false })
}

export interface AttachmentLogger {
  error(error: unknown): void
}

// Wraps the real repository, so use cases only ever see the plain attachment. The inner
// repository checks the owner first, so nothing is decrypted for anyone else.
export class EncryptedAttachmentRepository implements TransactionRepository {
  constructor(
    private readonly inner: TransactionRepository,
    private readonly cipher: DataCipher,
    private readonly logger?: AttachmentLogger,
  ) {}

  async findAllByUser(userId: string): Promise<Transaction[]> {
    return Promise.all((await this.inner.findAllByUser(userId)).map(transaction => this.open(transaction)))
  }

  async findById(id: string, userId: string): Promise<Transaction | null> {
    const transaction = await this.inner.findById(id, userId)
    return transaction && this.open(transaction)
  }

  async create(transaction: Transaction): Promise<Transaction> {
    return this.open(await this.inner.create(await this.seal(transaction)))
  }

  async update(transaction: Transaction): Promise<void> {
    await this.inner.update(await this.seal(transaction))
  }

  delete(id: string, userId: string): Promise<void> {
    return this.inner.delete(id, userId)
  }

  private async seal(transaction: Transaction): Promise<Transaction> {
    // Editing other fields must not erase a value that may open again with the right key
    if (transaction.attachmentUnavailable) {
      const stored = await this.inner.findById(transaction.id, transaction.userId)
      return withAttachment(transaction, stored?.attachment)
    }
    if (transaction.attachment === undefined) return transaction
    const sealed = await this.cipher.encrypt(toBytes(transaction.attachment), transaction.userId)
    return withAttachment(transaction, sealed)
  }

  private async open(transaction: Transaction): Promise<Transaction> {
    if (transaction.attachment === undefined) return transaction
    try {
      const bytes = await this.cipher.decrypt(transaction.attachment, transaction.userId)
      return withAttachment(transaction, toDataUrl(bytes))
    } catch (error) {
      // Only the id goes to the log. One damaged file must not take the whole statement down.
      this.logger?.error(
        new InfrastructureError(`Attachment could not be read: ${transaction.id}`, {
          code: 'UNREADABLE_DATA',
          cause: error,
        }),
      )
      return Transaction.fromPrimitives({
        ...withAttachment(transaction, undefined).toPrimitives(),
        attachmentUnavailable: true,
      })
    }
  }
}
