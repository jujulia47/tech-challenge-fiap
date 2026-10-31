import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, securityHeaders, withContentSecurityPolicy } from './securityHeaders'

const directive = (policy: string, name: string) => policy.split('; ').find(part => part.startsWith(`${name} `))

describe('securityHeaders', () => {
  const names = (isHttpsProduction: boolean) => securityHeaders(isHttpsProduction).map(header => header.key)

  it('sends the basic headers everywhere', () => {
    expect(names(false)).toEqual(['X-Content-Type-Options', 'Referrer-Policy', 'X-Frame-Options', 'Permissions-Policy'])
  })

  it('sends HSTS only in production over HTTPS', () => {
    expect(names(false)).not.toContain('Strict-Transport-Security')
    expect(names(true)).toContain('Strict-Transport-Security')
  })
})

describe('contentSecurityPolicy', () => {
  const production = contentSecurityPolicy('abc')

  it('allows scripts by nonce, never inline or eval', () => {
    expect(directive(production, 'script-src')).toBe("script-src 'self' 'nonce-abc' 'strict-dynamic'")
    expect(production).not.toContain('unsafe-eval')
    expect(directive(production, 'script-src')).not.toContain('unsafe-inline')
  })

  it('allows no inline style in production', () => {
    expect(directive(production, 'style-src')).toBe("style-src 'self'")
    expect(production).not.toContain('style-src-attr')
  })

  it('closes what the app does not use', () => {
    expect(production).toContain("object-src 'none'")
    expect(production).toContain("base-uri 'none'")
    expect(production).toContain("frame-ancestors 'none'")
  })

  it('covers how attachments are shown', () => {
    expect(directive(production, 'img-src')).toContain('data:')
    expect(directive(production, 'frame-src')).toBe('frame-src data:')
  })

  it('relaxes only for development', () => {
    const development = contentSecurityPolicy('abc', true)

    expect(directive(development, 'script-src')).toContain("'unsafe-eval'")
    expect(directive(development, 'connect-src')).toContain('ws:')
    expect(directive(production, 'connect-src')).toBe("connect-src 'self'")
  })
})

describe('withContentSecurityPolicy', () => {
  it('gives every request its own nonce', () => {
    const nonceOf = (policy: string) => /'nonce-([^']+)'/.exec(policy)?.[1]

    const first = withContentSecurityPolicy(new Headers())
    const second = withContentSecurityPolicy(new Headers())

    expect(nonceOf(first.policy)).toBeTruthy()
    expect(nonceOf(first.policy)).not.toBe(nonceOf(second.policy))
  })

  it('puts the policy on the request and keeps the other headers', () => {
    const { requestHeaders, policy } = withContentSecurityPolicy(new Headers({ cookie: 'a=b' }))

    expect(requestHeaders.get('Content-Security-Policy')).toBe(policy)
    expect(requestHeaders.get('cookie')).toBe('a=b')
  })
})
