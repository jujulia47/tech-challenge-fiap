import { Transaction } from '@bytebank/core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { HttpTransactionRepository } from './HttpTransactionRepository'

const BASE_URL = 'http://api.test'
const record = { id: '1', userId: 'user-a', type: 'deposit', amountInCents: 15000, date: '2022-11-18' }
const otherUserRecord = { ...record, id: '2', userId: 'user-b' }

const fetchMock = vi.fn<typeof fetch>()

function respondWith(body: unknown, status = 200) {
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify(body), { status }))
}

function respondWithStatus(status: number) {
  fetchMock.mockResolvedValueOnce(new Response('secret server detail', { status }))
}

const repository = new HttpTransactionRepository(BASE_URL)
const transaction = Transaction.fromPrimitives(record)

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('HttpTransactionRepository', () => {
  it('ignores trailing slashes in the base url', async () => {
    respondWith(record)

    await new HttpTransactionRepository(`${BASE_URL}//`).findById('1', 'user-a')

    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/transactions/1`)
  })

  describe('findAllByUser', () => {
    it('filters with _where, keeping the user id as a string', async () => {
      respondWith([record])

      await repository.findAllByUser('1')

      const url = new URL(String(fetchMock.mock.calls[0][0]))
      expect(url.pathname).toBe('/transactions')
      expect(JSON.parse(String(url.searchParams.get('_where')))).toEqual({ userId: { eq: '1' } })
    })

    it('encodes special characters in the user id', async () => {
      respondWith([])

      await repository.findAllByUser('a&b="c"')

      const url = new URL(String(fetchMock.mock.calls[0][0]))
      expect(JSON.parse(String(url.searchParams.get('_where')))).toEqual({ userId: { eq: 'a&b="c"' } })
    })

    it('returns entities', async () => {
      respondWith([record])

      const [found] = await repository.findAllByUser('user-a')

      expect(found).toBeInstanceOf(Transaction)
      expect(found.toPrimitives()).toEqual(record)
    })

    it('drops records of other users even if the server ignores the filter', async () => {
      respondWith([record, otherUserRecord])

      const found = await repository.findAllByUser('user-a')

      expect(found.map(t => t.id)).toEqual(['1'])
    })

    it('rejects an invalid stored record as corrupted, with its id', async () => {
      respondWith([{ ...record, id: 'broken', type: 'Depósito' }])

      await expect(repository.findAllByUser('user-a')).rejects.toMatchObject({
        name: 'InfrastructureError',
        code: 'CORRUPTED_RECORD',
        message: 'Stored transaction is invalid: broken',
      })
    })

    it('rejects a record in the legacy format as corrupted', async () => {
      respondWith([{ id: '1', date: '18/11/2022', label: 'Depósito', amount: 'R$ 150,00', month: 'novembro' }])

      await expect(repository.findAllByUser('user-a')).rejects.toMatchObject({ code: 'CORRUPTED_RECORD' })
    })

    it('rejects a response that is not a list', async () => {
      respondWith({ data: [] })

      await expect(repository.findAllByUser('user-a')).rejects.toMatchObject({
        name: 'InfrastructureError',
        code: 'UPSTREAM_INVALID_RESPONSE',
      })
    })

    it('throws on a non-2xx response', async () => {
      respondWithStatus(500)

      await expect(repository.findAllByUser('user-a')).rejects.toMatchObject({
        name: 'InfrastructureError',
        code: 'UPSTREAM_BAD_STATUS',
        status: 500,
      })
    })
  })

  describe('findById', () => {
    it('returns the transaction of the user', async () => {
      respondWith(record)

      const found = await repository.findById('1', 'user-a')

      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/transactions/1`)
      expect(found?.toPrimitives()).toEqual(record)
    })

    it('encodes the id', async () => {
      respondWith(record)

      await repository.findById('a/b', 'user-a')

      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/transactions/a%2Fb`)
    })

    it('returns null on 404', async () => {
      respondWithStatus(404)

      await expect(repository.findById('missing', 'user-a')).resolves.toBeNull()
    })

    it('returns null when the transaction belongs to another user', async () => {
      respondWith(otherUserRecord)

      await expect(repository.findById('2', 'user-a')).resolves.toBeNull()
    })

    it('throws with status and url on other errors, without leaking the body', async () => {
      respondWithStatus(503)

      const error = await repository.findById('1', 'user-a').catch((e: unknown) => e)

      expect(error).toMatchObject({ status: 503, url: `${BASE_URL}/transactions/1` })
      expect(String(error)).not.toContain('secret server detail')
    })

    it('rejects an invalid stored record as corrupted', async () => {
      respondWith({ ...record, amountInCents: 'R$ 150,00' })

      await expect(repository.findById('1', 'user-a')).rejects.toMatchObject({
        name: 'InfrastructureError',
        code: 'CORRUPTED_RECORD',
      })
    })

    it('reads a corrupted record before it can check the owner', async () => {
      respondWith({ ...otherUserRecord, type: 'Depósito' })

      await expect(repository.findById('2', 'user-a')).rejects.toMatchObject({ code: 'CORRUPTED_RECORD' })
    })
  })

  describe('when no response arrives', () => {
    const networkFailure = new TypeError('fetch failed')
    const unreachable = { name: 'InfrastructureError', code: 'UPSTREAM_UNREACHABLE', cause: networkFailure }

    it.each([
      ['findAllByUser', () => repository.findAllByUser('user-a')],
      ['findById', () => repository.findById('1', 'user-a')],
      ['create', () => repository.create(transaction)],
      ['update', () => repository.update(transaction)],
      ['delete', () => repository.delete('1', 'user-a')],
    ])('%s reports the backend as unreachable', async (_, call) => {
      fetchMock.mockRejectedValueOnce(networkFailure)

      await expect(call()).rejects.toMatchObject(unreachable)
    })

    it.each([
      ['update', () => repository.update(transaction)],
      ['delete', () => repository.delete('1', 'user-a')],
    ])('%s reports a failure on the write after the owner check', async (_, call) => {
      respondWith(record)
      fetchMock.mockRejectedValueOnce(networkFailure)

      await expect(call()).rejects.toMatchObject(unreachable)
    })

    it('names the url in the error', async () => {
      fetchMock.mockRejectedValueOnce(networkFailure)

      await expect(repository.findById('1', 'user-a')).rejects.toMatchObject({
        url: `${BASE_URL}/transactions/1`,
        message: `Could not reach the backend: ${BASE_URL}/transactions/1`,
      })
    })
  })

  describe('when the response is not JSON', () => {
    function respondWithText(status = 200) {
      fetchMock.mockResolvedValueOnce(new Response('<!doctype html>secret server detail', { status }))
    }

    it.each([
      ['findAllByUser', () => repository.findAllByUser('user-a')],
      ['findById', () => repository.findById('1', 'user-a')],
      ['create', () => repository.create(transaction)],
    ])('%s reports an invalid response', async (_, call) => {
      respondWithText()

      await expect(call()).rejects.toMatchObject({
        name: 'InfrastructureError',
        code: 'UPSTREAM_INVALID_RESPONSE',
      })
    })

    it('keeps the body out of the error, including the cause', async () => {
      respondWithText()

      const error = (await repository.findById('1', 'user-a').catch((e: unknown) => e)) as Error

      expect(error.message).not.toContain('secret server detail')
      expect(error.message).not.toContain('doctype')
      expect(error.cause).toBeUndefined()
    })
  })

  describe('create', () => {
    it('posts the record and returns what the server stored, with its id', async () => {
      respondWith({ ...record, id: 'server-id' }, 201)

      const created = await repository.create(transaction)

      const [url, init] = fetchMock.mock.calls[0]
      expect(url).toBe(`${BASE_URL}/transactions`)
      expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'application/json' } })
      expect(JSON.parse(String(init?.body))).toEqual(record)
      expect(created.id).toBe('server-id')
    })

    it('throws on a non-2xx response', async () => {
      respondWithStatus(500)

      await expect(repository.create(transaction)).rejects.toMatchObject({ status: 500 })
    })
  })

  describe('update', () => {
    it('confirms the owner, then puts the record', async () => {
      respondWith(record)
      respondWith(record)

      await repository.update(transaction)

      expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/transactions/1`)
      const [url, init] = fetchMock.mock.calls[1]
      expect(url).toBe(`${BASE_URL}/transactions/1`)
      expect(init).toMatchObject({ method: 'PUT' })
      expect(JSON.parse(String(init?.body))).toEqual(record)
    })

    it('does not write when the transaction belongs to another user', async () => {
      respondWith(otherUserRecord)

      await expect(repository.update(transaction)).rejects.toMatchObject({ code: 'TRANSACTION_NOT_FOUND' })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('does not write when the transaction does not exist', async () => {
      respondWithStatus(404)

      await expect(repository.update(transaction)).rejects.toMatchObject({ code: 'TRANSACTION_NOT_FOUND' })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('throws when the write fails', async () => {
      respondWith(record)
      respondWithStatus(500)

      await expect(repository.update(transaction)).rejects.toMatchObject({ status: 500 })
    })
  })

  describe('delete', () => {
    it('confirms the owner, then deletes', async () => {
      respondWith(record)
      respondWith(record)

      await repository.delete('1', 'user-a')

      expect(fetchMock.mock.calls[1][0]).toBe(`${BASE_URL}/transactions/1`)
      expect(fetchMock.mock.calls[1][1]).toMatchObject({ method: 'DELETE' })
    })

    it('does not delete a transaction of another user', async () => {
      respondWith(otherUserRecord)

      await expect(repository.delete('2', 'user-a')).rejects.toMatchObject({ code: 'TRANSACTION_NOT_FOUND' })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('throws when the delete fails', async () => {
      respondWith(record)
      respondWithStatus(500)

      await expect(repository.delete('1', 'user-a')).rejects.toMatchObject({ status: 500 })
    })
  })
})
