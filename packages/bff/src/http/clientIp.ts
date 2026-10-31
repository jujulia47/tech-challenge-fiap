// The last entry is the one added by the closest proxy, and the only one a client cannot choose
// when a proxy is there. Without one, the client can send this header: see docs/fase4/security.md.
export function clientIp(headers: Headers): string | undefined {
  return headers.get('x-forwarded-for')?.split(',').at(-1)?.trim() || undefined
}
