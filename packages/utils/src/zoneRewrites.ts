// No imports on purpose: next.config.ts reads this file directly, before anything is bundled.

type Env = Record<string, string | undefined>

export interface Rewrite {
  source: string
  destination: string
}

// The zones are served under the shell origin: /dashboard and /transactions are proxied to the
// apps that hold them. The hosts come from variables: Docker passes the service names and Vercel
// the public URLs of the projects. Only a local run may fall back to localhost: on Vercel a
// missing host would send every visitor of a zone to nowhere, so the build stops instead.
export function zoneRewrites(env: Env): Rewrite[] {
  const fallback = (port: number) => (env.VERCEL ? undefined : `http://localhost:${port}`)
  const dashboardUrl = env.DASHBOARD_URL || fallback(3003)
  const transactionsUrl = env.TRANSACTIONS_URL || fallback(3002)
  if (!dashboardUrl || !transactionsUrl) {
    throw new Error('DASHBOARD_URL and TRANSACTIONS_URL must be set on Vercel: docs/fase4/deploy.md')
  }
  // Exact (bare) rules are required in addition to the wildcard: `/dashboard`
  // does not match `/dashboard/:path*`, and post-login lands on the bare path.
  return [
    { source: '/dashboard', destination: `${dashboardUrl}/dashboard` },
    { source: '/dashboard/:path*', destination: `${dashboardUrl}/dashboard/:path*` },
    { source: '/transactions', destination: `${transactionsUrl}/transactions` },
    { source: '/transactions/:path*', destination: `${transactionsUrl}/transactions/:path*` },
  ]
}
