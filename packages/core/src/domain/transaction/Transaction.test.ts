import { describe, expect, it } from 'vitest'
import { CalendarDate } from '../value-objects/CalendarDate'
import { Money } from '../value-objects/Money'
import { Transaction, type TransactionProps } from './Transaction'
import { TRANSACTION_TYPES, transactionDirection, type TransactionType } from './TransactionType'

function props(overrides: Partial<TransactionProps> = {}): TransactionProps {
  return {
    id: '1',
    userId: '1',
    type: 'deposit',
    amount: Money.fromCents(15000),
    date: CalendarDate.fromISO('2022-11-18'),
    ...overrides,
  }
}

const primitives = {
  id: '1',
  userId: '1',
  type: 'deposit',
  amountInCents: 15000,
  date: '2022-11-18',
}

describe('Transaction', () => {
  describe('create', () => {
    it('exposes its props through getters', () => {
      const attachment = 'data:image/png;base64,AAAA'
      const tx = Transaction.create(props({ attachment }))

      expect(tx.id).toBe('1')
      expect(tx.userId).toBe('1')
      expect(tx.type).toBe('deposit')
      expect(tx.amount.toCents()).toBe(15000)
      expect(tx.date.toISO()).toBe('2022-11-18')
      expect(tx.attachment).toBe(attachment)
    })

    it('has no attachment by default', () => {
      expect(Transaction.create(props()).attachment).toBeUndefined()
    })

    it.each(['', '   '])('rejects the id %j', id => {
      expect(() => Transaction.create(props({ id }))).toThrow(
        expect.objectContaining({ code: 'TRANSACTION_INVALID_ID' }),
      )
    })

    it.each(['', '   '])('rejects the userId %j', userId => {
      expect(() => Transaction.create(props({ userId }))).toThrow(
        expect.objectContaining({ code: 'TRANSACTION_INVALID_USER_ID' }),
      )
    })

    it('rejects an unknown type', () => {
      expect(() => Transaction.create(props({ type: 'Depósito' as TransactionType }))).toThrow(
        expect.objectContaining({ code: 'TRANSACTION_INVALID_TYPE' }),
      )
    })

    it.each([0, -1, -15000])('rejects the amount %d', cents => {
      expect(() => Transaction.create(props({ amount: Money.fromCents(cents) }))).toThrow(
        expect.objectContaining({ code: 'TRANSACTION_INVALID_AMOUNT' }),
      )
    })

    it('accepts the smallest positive amount', () => {
      expect(Transaction.create(props({ amount: Money.fromCents(1) })).amount.toCents()).toBe(1)
    })
  })

  describe('immutability', () => {
    it('is frozen at runtime', () => {
      expect(Object.isFrozen(Transaction.create(props()))).toBe(true)
    })

    it('does not follow later changes to the input object', () => {
      const input = props()
      const tx = Transaction.create(input)
      input.id = 'changed'

      expect(tx.id).toBe('1')
    })
  })

  it('monthKey delegates to the date', () => {
    expect(Transaction.create(props()).monthKey()).toBe('2022-11')
  })

  describe('signedAmount', () => {
    it.each(TRANSACTION_TYPES)('follows the direction of %s', type => {
      const signed = Transaction.create(props({ type })).signedAmount().toCents()

      expect(signed).toBe(transactionDirection(type) === 'income' ? 15000 : -15000)
    })

    it('does not change the stored magnitude', () => {
      const tx = Transaction.create(props({ type: 'payment' }))
      tx.signedAmount()

      expect(tx.amount.toCents()).toBe(15000)
    })
  })

  describe('update', () => {
    it('changes type, amount, date and attachment', () => {
      const updated = Transaction.create(props()).update({
        type: 'payment',
        amount: Money.fromCents(100),
        date: CalendarDate.fromISO('2026-03-08'),
        attachment: 'data:application/pdf;base64,AAAA',
      })

      expect(updated.type).toBe('payment')
      expect(updated.amount.toCents()).toBe(100)
      expect(updated.date.toISO()).toBe('2026-03-08')
      expect(updated.attachment).toBe('data:application/pdf;base64,AAAA')
    })

    it('returns a new instance and leaves the original unchanged', () => {
      const original = Transaction.create(props())
      const updated = original.update({ amount: Money.fromCents(1) })

      expect(updated).not.toBe(original)
      expect(original.amount.toCents()).toBe(15000)
    })

    it('keeps everything that is not changed', () => {
      const original = Transaction.create(props({ id: '7', userId: '2', attachment: 'file' }))
      const updated = original.update({ type: 'loan' })

      expect(updated.toPrimitives()).toEqual({ ...original.toPrimitives(), type: 'loan' })
    })

    it('removes the attachment when it is explicitly undefined', () => {
      const original = Transaction.create(props({ attachment: 'file' }))

      expect(original.update({ attachment: undefined }).attachment).toBeUndefined()
      expect(original.attachment).toBe('file')
    })

    it('revalidates the invariants', () => {
      const original = Transaction.create(props())

      expect(() => original.update({ amount: Money.zero() })).toThrow(
        expect.objectContaining({ code: 'TRANSACTION_INVALID_AMOUNT' }),
      )
      expect(() => original.update({ type: 'unknown' as TransactionType })).toThrow(
        expect.objectContaining({ code: 'TRANSACTION_INVALID_TYPE' }),
      )
    })
  })

  describe('toPrimitives', () => {
    it('returns a plain object', () => {
      expect(Transaction.create(props()).toPrimitives()).toEqual(primitives)
    })

    it('omits the attachment key when there is none', () => {
      expect(Transaction.create(props()).toPrimitives()).not.toHaveProperty('attachment')
    })

    it('includes the attachment when there is one', () => {
      expect(Transaction.create(props({ attachment: 'file' })).toPrimitives().attachment).toBe('file')
    })
  })

  describe('fromPrimitives', () => {
    it('round-trips with toPrimitives', () => {
      const withAttachment = { ...primitives, attachment: 'file' }

      expect(Transaction.fromPrimitives(primitives).toPrimitives()).toEqual(primitives)
      expect(Transaction.fromPrimitives(withAttachment).toPrimitives()).toEqual(withAttachment)
    })

    it('rejects an empty userId (records still to be migrated in step 1.3)', () => {
      expect(() => Transaction.fromPrimitives({ ...primitives, userId: '' })).toThrow(
        expect.objectContaining({ code: 'TRANSACTION_INVALID_USER_ID' }),
      )
    })

    it('rejects a type label from the current data', () => {
      expect(() => Transaction.fromPrimitives({ ...primitives, type: 'Depósito' })).toThrow(
        expect.objectContaining({ code: 'TRANSACTION_INVALID_TYPE' }),
      )
    })

    it('rejects invalid cents', () => {
      expect(() => Transaction.fromPrimitives({ ...primitives, amountInCents: 150.5 })).toThrow(
        expect.objectContaining({ code: 'MONEY_INVALID_CENTS' }),
      )
    })

    it('rejects a date in the current dd/mm/yyyy format', () => {
      expect(() => Transaction.fromPrimitives({ ...primitives, date: '18/11/2022' })).toThrow(
        expect.objectContaining({ code: 'CALENDAR_DATE_INVALID_FORMAT' }),
      )
    })
  })
})
