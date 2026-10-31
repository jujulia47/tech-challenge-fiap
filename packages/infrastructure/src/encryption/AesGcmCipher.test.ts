import { describe, expect, it } from 'vitest'
import { AesGcmCipher } from './AesGcmCipher'

const key = Buffer.alloc(32, 1)
const cipher = new AesGcmCipher(key)
const plaintext = Buffer.from('conteúdo do anexo')
const CONTEXT = 'user-a'

const failure = (promise: Promise<unknown>) => promise.catch((error: unknown) => error)

// Flips one bit of a base64url part, keeping the format valid
function tamper(sealed: string, part: number): string {
  const parts = sealed.split('$')
  const bytes = Buffer.from(parts[part], 'base64url')
  bytes[0] ^= 1
  parts[part] = bytes.toString('base64url')
  return parts.join('$')
}

describe('AesGcmCipher', () => {
  it('opens what it sealed', async () => {
    const sealed = await cipher.encrypt(plaintext, CONTEXT)

    expect(Buffer.from(await cipher.decrypt(sealed, CONTEXT))).toEqual(plaintext)
  })

  it('handles binary data', async () => {
    const binary = Buffer.from([0, 255, 10, 13, 128])

    expect(Buffer.from(await cipher.decrypt(await cipher.encrypt(binary, CONTEXT), CONTEXT))).toEqual(binary)
  })

  it('writes the algorithm, the key version, a 12-byte IV, the tag and the data', async () => {
    const [algorithm, version, iv, tag] = (await cipher.encrypt(plaintext, CONTEXT)).split('$')

    expect([algorithm, version]).toEqual(['aes256gcm', 'v1'])
    expect(Buffer.from(iv, 'base64url')).toHaveLength(12)
    expect(Buffer.from(tag, 'base64url')).toHaveLength(16)
  })

  it('uses a different IV every time', async () => {
    const values = await Promise.all(Array.from({ length: 50 }, () => cipher.encrypt(plaintext, CONTEXT)))

    expect(new Set(values.map(value => value.split('$')[2])).size).toBe(50)
    expect(new Set(values).size).toBe(50)
  })

  it('does not contain the plaintext', async () => {
    const sealed = await cipher.encrypt(plaintext, CONTEXT)

    expect(sealed).not.toContain(plaintext.toString('base64url'))
  })

  it.each([
    ['the IV', 2],
    ['the tag', 3],
    ['the data', 4],
  ])('refuses a change in %s', async (_, part) => {
    const sealed = await cipher.encrypt(plaintext, CONTEXT)

    await expect(cipher.decrypt(tamper(sealed, part), CONTEXT)).rejects.toMatchObject({ code: 'UNREADABLE_DATA' })
  })

  it('refuses a truncated tag, which GCM would otherwise accept', async () => {
    const parts = (await cipher.encrypt(plaintext, CONTEXT)).split('$')
    parts[3] = Buffer.from(parts[3], 'base64url').subarray(0, 4).toString('base64url')

    await expect(cipher.decrypt(parts.join('$'), CONTEXT)).rejects.toMatchObject({ code: 'UNREADABLE_DATA' })
  })

  it('refuses the wrong key', async () => {
    const sealed = await cipher.encrypt(plaintext, CONTEXT)

    await expect(new AesGcmCipher(Buffer.alloc(32, 2)).decrypt(sealed, CONTEXT)).rejects.toMatchObject({
      code: 'UNREADABLE_DATA',
    })
  })

  it('refuses another context: a value moved to another owner does not open', async () => {
    const sealed = await cipher.encrypt(plaintext, 'user-a')

    await expect(cipher.decrypt(sealed, 'user-b')).rejects.toMatchObject({ code: 'UNREADABLE_DATA' })
  })

  it('refuses an unknown key version', async () => {
    const sealed = (await cipher.encrypt(plaintext, CONTEXT)).replace('$v1$', '$v2$')

    await expect(cipher.decrypt(sealed, CONTEXT)).rejects.toMatchObject({ code: 'UNREADABLE_DATA' })
  })

  it.each([
    ['plain text', 'data:image/png;base64,AAAA'],
    ['an empty value', ''],
    ['another algorithm', 'aes128$v1$a$b$c'],
    ['a missing part', 'aes256gcm$v1$a$b'],
  ])('refuses %s', async (_, sealed) => {
    await expect(cipher.decrypt(sealed, CONTEXT)).rejects.toMatchObject({ code: 'UNREADABLE_DATA' })
  })

  it('gives one message for every failure, with no detail', async () => {
    const sealed = await cipher.encrypt(plaintext, CONTEXT)

    const errors = await Promise.all([
      failure(cipher.decrypt(tamper(sealed, 4), CONTEXT)),
      failure(cipher.decrypt('nonsense', CONTEXT)),
      failure(cipher.decrypt(sealed, 'user-b')),
    ])

    expect(new Set(errors.map(error => (error as Error).message))).toEqual(new Set(['Stored data could not be decrypted']))
    expect(errors.every(error => (error as Error).cause === undefined)).toBe(true)
  })

  describe('key', () => {
    it('reads a key in base64', async () => {
      const sealed = await cipher.encrypt(plaintext, CONTEXT)

      const fromVariable = AesGcmCipher.fromBase64(key.toString('base64'))

      expect(Buffer.from(await fromVariable.decrypt(sealed, CONTEXT))).toEqual(plaintext)
    })

    it.each([
      ['short', 'c2hvcnQta2V5'],
      ['empty', ''],
      ['not base64', '#'.repeat(44)],
    ])('refuses a key that is %s, without quoting it', (_, value) => {
      expect(() => AesGcmCipher.fromBase64(value)).toThrow('The encryption key must have 32 bytes')
    })
  })
})
