import { readFileSync } from 'node:fs'
import { GetBalance } from '@bytebank/core'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { HttpTransactionRepository } from '../json-server/HttpTransactionRepository'
import { migrateTransactions } from './migrateTransactions'

const legacy = { id: '1', date: '18/11/2022', label: 'Depósito', amount: 'R$ 150,00', month: 'novembro' }
const migrated = { id: '1', userId: '1', type: 'deposit', amountInCents: 15000, date: '2022-11-18' }

const migrateOne = (record: unknown) => migrateTransactions([record], '1')

function readTransactions(relativePath: string): unknown[] {
  const db = JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8')) as { transactions: unknown[] }
  return db.transactions
}

describe('migrateTransactions', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('the frozen legacy records (fixtures/legacy-db.json)', () => {
    const records = readTransactions('./fixtures/legacy-db.json')

    it('migrates the 7 records without errors', () => {
      const { transactions, errors, summary } = migrateTransactions(records, '1')

      expect(errors).toEqual([])
      expect(summary).toEqual({ total: 7, migrated: 7, alreadyMigrated: 0, errors: 0 })
      expect(transactions[0]).toEqual(migrated)
      expect(transactions[6]).toEqual({
        id: '11',
        userId: '1',
        type: 'currency_exchange',
        amountInCents: 120000,
        date: '2026-03-08',
      })
    })

    it('gives a balance of 115000 cents through GetBalance', async () => {
      const { transactions } = migrateTransactions(records, '1')
      vi.stubGlobal('fetch', async () => new Response(JSON.stringify(transactions)))

      const balance = await new GetBalance(new HttpTransactionRepository('http://api.test')).execute('1')

      expect(balance).toEqual({ amountInCents: 115000 })
    })
  })

  // The database in use is not versioned, so this reads the seed that creates it
  describe('the seed in apps/shell/data/db.seed.json', () => {
    it('migrates every record without errors', () => {
      const records = readTransactions('../../../../apps/shell/data/db.seed.json')

      const { transactions, errors } = migrateTransactions(records, '1')

      expect(errors).toEqual([])
      expect(transactions).toHaveLength(records.length)
    })
  })

  it('discards month, label and the text amount', () => {
    const [record] = migrateOne(legacy).transactions

    expect(Object.keys(record).sort()).toEqual(['amountInCents', 'date', 'id', 'type', 'userId'])
  })

  it.each([
    ['Depósito', 'deposit'],
    ['Saque', 'withdrawal'],
    ['Transferência', 'transfer'],
    ['Pagamento', 'payment'],
    ['Câmbio de Moeda', 'currency_exchange'],
    ['DOC/TED', 'doc_ted'],
    ['Empréstimo e Financiamento', 'loan'],
  ])('maps the label %s to %s', (label, type) => {
    expect(migrateOne({ ...legacy, label }).transactions[0].type).toBe(type)
  })

  describe('amount', () => {
    it.each([
      ['R$ 150,00', 15000],
      ['R$ 0,01', 1],
      ['R$ 1.234,56', 123456],
      ['R$ 1.000.000,00', 100000000],
      ['R$ 1234,56', 123456],
      ['R$1.234,56', 123456],
      ['  R$   1.234,56  ', 123456],
      ['R$ 1.234,56', 123456],
    ])('parses %j', (amount, cents) => {
      expect(migrateOne({ ...legacy, amount }).transactions[0].amountInCents).toBe(cents)
    })

    it.each(['-R$ 10,00', '- R$ 10,00', ' -R$ 10,00'])('reports the negative amount %j with the id', amount => {
      const { errors, transactions } = migrateOne({ ...legacy, amount })

      expect(transactions).toEqual([])
      expect(errors).toEqual([
        { id: '1', message: 'negative amount: the domain stores magnitudes; review this record manually' },
      ])
    })

    it.each(['150,00', 'R$ 150', 'R$ 150,0', 'R$ 1,234.56', 'R$ 1.23,45', 'R$ abc', ''])(
      'reports the invalid amount %j with the id',
      amount => {
        const { errors, transactions } = migrateOne({ ...legacy, amount })

        expect(transactions).toEqual([])
        expect(errors).toEqual([{ id: '1', message: `Invalid amount: "${amount}"` }])
      },
    )

    it('reports a zero amount, which the domain rejects', () => {
      expect(migrateOne({ ...legacy, amount: 'R$ 0,00' }).errors[0].id).toBe('1')
    })
  })

  describe('date', () => {
    it('prefers transactionDate over date', () => {
      const { transactions } = migrateOne({ ...legacy, date: '21/11/2022', transactionDate: '05/10/2022' })

      expect(transactions[0].date).toBe('2022-10-05')
    })

    it('falls back to date', () => {
      expect(migrateOne(legacy).transactions[0].date).toBe('2022-11-18')
    })

    it.each(['2022-11-18', '18/11/22', '1/11/2022', ''])('reports the invalid format %j', date => {
      expect(migrateOne({ ...legacy, date }).errors).toEqual([{ id: '1', message: `Invalid date: "${date}"` }])
    })

    it('reports a date that does not exist', () => {
      expect(migrateOne({ ...legacy, date: '31/02/2022' }).errors[0].id).toBe('1')
    })
  })

  it('keeps the attachment', () => {
    const attachment = 'data:image/png;base64,AAAA'

    expect(migrateOne({ ...legacy, attachment }).transactions[0].attachment).toBe(attachment)
  })

  it('reports an unknown label with the id', () => {
    expect(migrateOne({ ...legacy, id: '9', label: 'Pix' }).errors).toEqual([
      { id: '9', message: 'Unknown label: "Pix"' },
    ])
  })

  it('reports a label that only exists on Object.prototype', () => {
    expect(migrateOne({ ...legacy, label: 'constructor' }).errors).toHaveLength(1)
  })

  it('uses the given userId', () => {
    expect(migrateTransactions([legacy], 'user-a').transactions[0].userId).toBe('user-a')
  })

  it('reports an empty userId', () => {
    expect(migrateTransactions([legacy], '').errors[0].id).toBe('1')
  })

  describe('idempotency', () => {
    it('passes a record in the new format unchanged', () => {
      const { transactions, summary } = migrateTransactions([migrated], 'another-user')

      expect(transactions).toEqual([migrated])
      expect(summary).toEqual({ total: 1, migrated: 0, alreadyMigrated: 1, errors: 0 })
    })

    it('gives the same result when run twice', () => {
      const once = migrateTransactions([legacy, { ...legacy, id: '2' }], '1')
      const twice = migrateTransactions(once.transactions, '1')

      expect(twice.transactions).toEqual(once.transactions)
      expect(twice.summary.alreadyMigrated).toBe(2)
    })

    it('reports an invalid record in the new format', () => {
      expect(migrateOne({ ...migrated, type: 'Depósito' }).errors[0].id).toBe('1')
    })
  })

  describe('malformed records', () => {
    it.each([
      ['null', null, '(no id)'],
      ['a string', 'text', '(no id)'],
      ['a record without id', { label: 'Depósito' }, '(no id)'],
      ['a numeric id', { ...legacy, id: 1 }, '(no id)'],
      ['a missing label', { ...legacy, label: undefined }, '1'],
      ['a missing amount', { ...legacy, amount: undefined }, '1'],
      ['a missing date', { ...legacy, date: undefined }, '1'],
      ['a missing month', { ...legacy, month: undefined }, '1'],
      ['a non-string transactionDate', { ...legacy, transactionDate: 1 }, '1'],
      ['a non-string attachment', { ...legacy, attachment: 1 }, '1'],
    ])('reports %s', (_, record, id) => {
      const { errors, summary } = migrateOne(record)

      expect(errors[0].id).toBe(id)
      expect(summary).toEqual({ total: 1, migrated: 0, alreadyMigrated: 0, errors: 1 })
    })
  })

  it('keeps going after an error, so one run shows every problem', () => {
    const { transactions, summary } = migrateTransactions(
      [legacy, { ...legacy, id: '2', label: 'Pix' }, { ...legacy, id: '3', amount: 'x' }, migrated],
      '1',
    )

    expect(transactions).toHaveLength(2)
    expect(summary).toEqual({ total: 4, migrated: 1, alreadyMigrated: 1, errors: 2 })
  })

  it('handles an empty list', () => {
    expect(migrateTransactions([], '1').summary).toEqual({ total: 0, migrated: 0, alreadyMigrated: 0, errors: 0 })
  })
})
