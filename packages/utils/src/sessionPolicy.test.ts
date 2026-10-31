import { describe, expect, it } from 'vitest'
import { SESSION_POLICY, readSessionPolicy } from './sessionPolicy'

describe('readSessionPolicy', () => {
  it('uses the defaults with no variable', () => {
    expect(readSessionPolicy({})).toEqual(SESSION_POLICY)
  })

  it('renews before the session ends, by default', () => {
    expect(SESSION_POLICY.updateAgeSeconds).toBeLessThan(SESSION_POLICY.maxAgeSeconds)
  })

  it('warns before the idle timeout, by default', () => {
    expect(SESSION_POLICY.idleWarningSeconds).toBeLessThan(SESSION_POLICY.idleTimeoutSeconds)
  })

  it('shortens the times', () => {
    const policy = readSessionPolicy({
      SESSION_MAX_AGE_SECONDS: '60',
      IDLE_TIMEOUT_SECONDS: '30',
      IDLE_WARNING_SECONDS: '15',
    })

    expect(policy).toEqual({ maxAgeSeconds: 60, updateAgeSeconds: 20, idleTimeoutSeconds: 30, idleWarningSeconds: 15 })
  })

  it.each([
    ['longer than the default', '999999'],
    ['zero', '0'],
    ['negative', '-5'],
    ['not a number', 'abc'],
    ['a fraction', '1.5'],
    ['empty', ''],
  ])('ignores a value that is %s', (_, value) => {
    expect(readSessionPolicy({ SESSION_MAX_AGE_SECONDS: value }).maxAgeSeconds).toBe(SESSION_POLICY.maxAgeSeconds)
  })

  it('keeps the warning inside a shortened timeout', () => {
    expect(readSessionPolicy({ IDLE_TIMEOUT_SECONDS: '30' }).idleWarningSeconds).toBe(10)
  })
})
