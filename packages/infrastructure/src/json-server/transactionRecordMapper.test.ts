import { describe, expect, it } from 'vitest'
import { InfrastructureError } from '../errors/InfrastructureError'
import { parseTransactionRecord, recordFromPrimitives, transactionFromRecord } from './transactionRecordMapper'

const record = { id: '1', userId: '1', type: 'deposit', amountInCents: 15000, date: '2022-11-18' }

describe('transactionRecordMapper', () => {
  it('round-trips a record', () => {
    const primitives = transactionFromRecord(record).toPrimitives()

    expect(recordFromPrimitives(primitives)).toEqual(record)
  })

  it('round-trips a record with an attachment', () => {
    const withAttachment = { ...record, attachment: 'data:image/png;base64,AAAA' }

    expect(recordFromPrimitives(transactionFromRecord(withAttachment).toPrimitives())).toEqual(withAttachment)
  })

  it('drops unknown fields', () => {
    expect(parseTransactionRecord({ ...record, month: 'novembro' })).toEqual(record)
  })

  it.each([
    ['null', null],
    ['a string', 'text'],
    ['a missing id', { ...record, id: undefined }],
    ['a numeric id', { ...record, id: 1 }],
    ['a missing userId', { ...record, userId: undefined }],
    ['a missing type', { ...record, type: undefined }],
    ['a text amount', { ...record, amountInCents: 'R$ 150,00' }],
    ['a missing date', { ...record, date: undefined }],
    ['a non-string attachment', { ...record, attachment: 1 }],
  ])('rejects %s', (_, value) => {
    expect(() => parseTransactionRecord(value)).toThrow(InfrastructureError)
  })

  it('rejects data the domain does not accept', () => {
    expect(() => transactionFromRecord({ ...record, type: 'Depósito' })).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_INVALID_TYPE' }),
    )
    expect(() => transactionFromRecord({ ...record, amountInCents: 0 })).toThrow(
      expect.objectContaining({ code: 'TRANSACTION_INVALID_AMOUNT' }),
    )
  })
})
