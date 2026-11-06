import { describe, expect, it } from 'vitest'
import * as infrastructure from './index'

describe('@bytebank/infrastructure public API', () => {
  it('exports the adapters and the migration', () => {
    expect(Object.keys(infrastructure).sort()).toEqual([
      'AesGcmCipher',
      'CryptoIdGenerator',
      'CryptoResetTokenGenerator',
      'DisabledEmailSender',
      'EncryptedAttachmentRepository',
      'HttpPasswordResetTokenRepository',
      'HttpTransactionRepository',
      'HttpTransactionStatistics',
      'HttpUserRepository',
      'InMemoryRateLimiter',
      'InfrastructureError',
      'PostgresRateLimiter',
      'SaoPauloClock',
      'ScryptPasswordHasher',
      'SmtpEmailSender',
      'StaticCommonPasswordList',
      'SupabasePasswordResetTokenRepository',
      'SupabaseTransactionRepository',
      'SupabaseTransactionStatistics',
      'SupabaseUserRepository',
      'createSupabaseDatabase',
      'migrateTransactions',
      'parseTransactionRecord',
      'recordFromPrimitives',
      'transactionFromRecord',
    ])
  })
})
