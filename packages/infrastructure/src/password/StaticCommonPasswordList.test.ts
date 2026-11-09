import { describe, expect, it } from 'vitest'
import { StaticCommonPasswordList } from './StaticCommonPasswordList'

const list = new StaticCommonPasswordList()

describe('StaticCommonPasswordList', () => {
  it.each(['password', '123456', 'qwerty'])('has %s', async password => {
    await expect(list.has(password)).resolves.toBe(true)
  })

  it.each(['12345678', 'qwertyuiop', '11111111', '1q2w3e4r', 'abc12345'])(
    'has the common passwords of 8 characters or more: %s',
    async password => {
      await expect(list.has(password)).resolves.toBe(true)
    },
  )

  it.each(['password123', 'senha12345', 'brasil2026', '2024dragon!', 'senha', 'flamengo1', 'teamo123'])(
    'has a listed word with digits or symbols around it, in English or Portuguese: %s',
    async password => {
      await expect(list.has(password)).resolves.toBe(true)
    },
  )

  it.each(['correcthorsebatterystaple', 'k7#vqm2x', 'xk9mq2pr7tlw3zb', 'abc7391x'])(
    'does not have a long phrase or a random password: %s',
    async password => {
      await expect(list.has(password)).resolves.toBe(false)
    },
  )

  it('leaves alone a short word with digits around it', async () => {
    // "abc" is not 4 letters long, so 91abc28 is not taken for it
    await expect(list.has('91abc28')).resolves.toBe(false)
  })
})
