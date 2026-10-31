import { describe, expect, it } from 'vitest'
import * as infrastructure from './index'

describe('@bytebank/infrastructure public API', () => {
  it('exports the adapters and the migration', () => {
    expect(Object.keys(infrastructure).sort()).toEqual([
      'AesGcmCipher',
      'CryptoIdGenerator',
      'CryptoResetTokenGenerator',
      'EncryptedAttachmentRepository',
      'HttpPasswordResetTokenRepository',
      'HttpTransactionRepository',
      'HttpUserRepository',
      'InMemoryRateLimiter',
      'InfrastructureError',
      'SaoPauloClock',
      'ScryptPasswordHasher',
      'SmtpEmailSender',
      'StaticCommonPasswordList',
      'migrateTransactions',
      'parseTransactionRecord',
      'recordFromPrimitives',
      'transactionFromRecord',
    ])
  })
})
