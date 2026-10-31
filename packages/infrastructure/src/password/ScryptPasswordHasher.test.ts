import { describe, expect, it } from 'vitest'
import { ScryptPasswordHasher } from './ScryptPasswordHasher'

const hasher = new ScryptPasswordHasher()
const fast = new ScryptPasswordHasher({ N: 2 ** 10, r: 8, p: 1 })

describe('ScryptPasswordHasher', () => {
  it('describes itself: algorithm, parameters, salt and hash', async () => {
    expect(await hasher.hash('secret')).toMatch(/^scrypt\$N=131072,r=8,p=1\$[\w-]{22}\$[\w-]{43}$/)
  })

  it('gives a different hash for the same password', async () => {
    expect(await fast.hash('secret')).not.toBe(await fast.hash('secret'))
  })

  it('never contains the password', async () => {
    expect(await fast.hash('secret')).not.toContain('secret')
  })

  it('verifies the right password', async () => {
    await expect(hasher.verify('secret', await hasher.hash('secret'))).resolves.toBe(true)
  })

  it('refuses a wrong password', async () => {
    await expect(fast.verify('wrong', await fast.hash('secret'))).resolves.toBe(false)
  })

  it('verifies with the parameters stored in the hash, so they can change later', async () => {
    await expect(hasher.verify('secret', await fast.hash('secret'))).resolves.toBe(true)
  })

  it('handles non-ASCII passwords', async () => {
    await expect(fast.verify('sênha çom açento', await fast.hash('sênha çom açento'))).resolves.toBe(true)
  })

  it.each([
    ['an empty value', ''],
    ['plain text', 'not-a-hash'],
    ['another algorithm', 'bcrypt$N=1024,r=8,p=1$c2FsdA$aGFzaA'],
    ['a missing part', 'scrypt$N=1024,r=8,p=1$c2FsdA'],
    ['an N that is not a power of two', 'scrypt$N=1000,r=8,p=1$c2FsdA$aGFzaA'],
    ['an N of one', 'scrypt$N=1,r=8,p=1$c2FsdA$aGFzaA'],
    ['an N that asks for too much memory', 'scrypt$N=2147483648,r=8,p=1$c2FsdA$aGFzaA'],
    ['an r that asks for too much memory', 'scrypt$N=131072,r=4096,p=1$c2FsdA$aGFzaA'],
    ['a p that asks for too much memory', 'scrypt$N=131072,r=8,p=4$c2FsdA$aGFzaA'],
    ['an r of zero', 'scrypt$N=1024,r=0,p=1$c2FsdA$aGFzaA'],
    ['a p of zero', 'scrypt$N=1024,r=8,p=0$c2FsdA$aGFzaA'],
    ['a hash that decodes to nothing', 'scrypt$N=1024,r=8,p=1$c2FsdA$-'],
  ])('answers false for %s', async (_, hash) => {
    await expect(fast.verify('secret', hash)).resolves.toBe(false)
  })

  it('reports a failure of the derivation', async () => {
    const broken = new ScryptPasswordHasher({ N: 1000, r: 8, p: 1 })

    await expect(broken.hash('secret')).rejects.toBeInstanceOf(Error)
  })
})
