import { describe, expect, it } from 'vitest'
import { StaticCommonPasswordList } from './StaticCommonPasswordList'

const list = new StaticCommonPasswordList()

describe('StaticCommonPasswordList', () => {
  it.each(['password', '123456', 'qwerty'])('has %s', async password => {
    await expect(list.has(password)).resolves.toBe(true)
  })

  it('does not have a long phrase', async () => {
    await expect(list.has('correcthorsebatterystaple')).resolves.toBe(false)
  })
})
