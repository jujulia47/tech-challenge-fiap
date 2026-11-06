import { describe, expect, it } from 'vitest'
import { zoneRewrites } from './zoneRewrites'

const PRODUCTION = {
  VERCEL: '1',
  DASHBOARD_URL: 'https://bytebank-dashboard.vercel.app',
  TRANSACTIONS_URL: 'https://bytebank-transactions-virid.vercel.app',
}

const destinations = (env: Record<string, string | undefined>) => zoneRewrites(env).map(rewrite => rewrite.destination)

describe('zoneRewrites', () => {
  it('sends each zone to the host of its variable, with the bare path and the wildcard', () => {
    expect(zoneRewrites(PRODUCTION)).toEqual([
      { source: '/dashboard', destination: 'https://bytebank-dashboard.vercel.app/dashboard' },
      { source: '/dashboard/:path*', destination: 'https://bytebank-dashboard.vercel.app/dashboard/:path*' },
      { source: '/transactions', destination: 'https://bytebank-transactions-virid.vercel.app/transactions' },
      { source: '/transactions/:path*', destination: 'https://bytebank-transactions-virid.vercel.app/transactions/:path*' },
    ])
  })

  it('uses the service names that Docker passes', () => {
    expect(destinations({ DASHBOARD_URL: 'http://dashboard:3003', TRANSACTIONS_URL: 'http://transactions:3002' })).toEqual([
      'http://dashboard:3003/dashboard',
      'http://dashboard:3003/dashboard/:path*',
      'http://transactions:3002/transactions',
      'http://transactions:3002/transactions/:path*',
    ])
  })

  it('falls back to localhost when run locally', () => {
    expect(destinations({})[0]).toBe('http://localhost:3003/dashboard')
    expect(destinations({})[2]).toBe('http://localhost:3002/transactions')
  })

  it.each(['DASHBOARD_URL', 'TRANSACTIONS_URL'])('stops the build on Vercel without %s, instead of a fixed host', name => {
    expect(() => zoneRewrites({ ...PRODUCTION, [name]: undefined })).toThrow('DASHBOARD_URL and TRANSACTIONS_URL must be set on Vercel')
    expect(() => zoneRewrites({ ...PRODUCTION, [name]: '' })).toThrow('must be set on Vercel')
  })
})
