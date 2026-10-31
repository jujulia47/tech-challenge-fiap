import { DomainError } from '@bytebank/core'
import { describe, expect, it } from 'vitest'
import { InfrastructureError } from '../errors/InfrastructureError'
import { idOf, parseTransactionRecord, recordFromPrimitives, transactionFromRecord } from './transactionRecordMapper'

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

  describe('transactionFromRecord on invalid stored data', () => {
    const read = (value: unknown) => {
      try {
        transactionFromRecord(value)
      } catch (error) {
        return error as InfrastructureError
      }
      throw new Error('Expected transactionFromRecord to throw')
    }

    it.each([
      ['a value the domain rejects', { ...record, type: 'Depósito' }],
      ['an amount the domain rejects', { ...record, amountInCents: 0 }],
      ['a date that does not exist', { ...record, date: '2022-02-31' }],
      ['a wrong field type', { ...record, amountInCents: 'R$ 150,00' }],
      ['a legacy record', { id: '1', date: '18/11/2022', label: 'Depósito', amount: 'R$ 150,00', month: 'novembro' }],
    ])('reports %s as a corrupted record, with the id in the message', (_, value) => {
      const error = read(value)

      expect(error).toBeInstanceOf(InfrastructureError)
      expect(error.code).toBe('CORRUPTED_RECORD')
      expect(error.message).toBe('Stored transaction is invalid: 1')
    })

    it('does not let a DomainError escape, and keeps it as the cause', () => {
      const error = read({ ...record, type: 'Depósito' })

      expect(error).not.toBeInstanceOf(DomainError)
      expect(error.cause).toBeInstanceOf(DomainError)
    })

    it.each([
      ['null', null],
      ['a text', 'text'],
      ['a numeric id', { ...record, id: 1 }],
    ])('reports %s without an id', (_, value) => {
      expect(read(value).message).toBe('Stored transaction is invalid: (no id)')
    })
  })

  describe('idOf', () => {
    it('returns a string id', () => {
      expect(idOf(record)).toBe('1')
    })

    it.each([[null], ['text'], [{}], [{ id: 1 }]])('has no id for %j', value => {
      expect(idOf(value)).toBe('(no id)')
    })
  })
})
