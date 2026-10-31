import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import type { DataCipher } from '@bytebank/core'
import { InfrastructureError } from '../errors/InfrastructureError'

const ALGORITHM = 'aes-256-gcm'
const KEY_BYTES = 32
const IV_BYTES = 12
const TAG_BYTES = 16
// The version names the key, so that a new key can be added while old values still open
const FORMAT = /^aes256gcm\$(v\d+)\$([\w-]+)\$([\w-]+)\$([\w-]+)$/
const CURRENT_VERSION = 'v1'

// One message for every failure: the reason would only help someone tampering with the data
function unreadable(): InfrastructureError {
  return new InfrastructureError('Stored data could not be decrypted', { code: 'UNREADABLE_DATA' })
}

export class AesGcmCipher implements DataCipher {
  private readonly key: Buffer

  // Rotation adds a map of versions here. Reading already goes through the version in the value.
  constructor(key: Uint8Array) {
    if (key.length !== KEY_BYTES) throw new InfrastructureError(`The encryption key must have ${KEY_BYTES} bytes`)
    this.key = Buffer.from(key)
  }

  // The key travels as base64 in a variable. The error never quotes the value.
  static fromBase64(key: string): AesGcmCipher {
    return new AesGcmCipher(Buffer.from(key, 'base64'))
  }

  async encrypt(plaintext: Uint8Array, context: string): Promise<string> {
    const iv = randomBytes(IV_BYTES)
    const cipher = createCipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_BYTES })
    cipher.setAAD(Buffer.from(context))
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const parts = [iv, cipher.getAuthTag(), ciphertext].map(part => part.toString('base64url'))
    return `aes256gcm$${CURRENT_VERSION}$${parts.join('$')}`
  }

  async decrypt(sealed: string, context: string): Promise<Uint8Array> {
    const match = FORMAT.exec(sealed)
    if (!match || match[1] !== CURRENT_VERSION) throw unreadable()

    const [iv, tag, ciphertext] = match.slice(2).map(part => Buffer.from(part, 'base64url'))
    if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) throw unreadable()
    try {
      const decipher = createDecipheriv(ALGORITHM, this.key, iv, { authTagLength: TAG_BYTES })
      decipher.setAAD(Buffer.from(context))
      decipher.setAuthTag(tag)
      return Buffer.concat([decipher.update(ciphertext), decipher.final()])
    } catch {
      throw unreadable()
    }
  }
}
