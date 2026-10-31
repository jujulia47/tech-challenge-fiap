function originOf(url: string | null): string | null {
  if (url === null) return null
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

// The whole origin is compared, so "app.com.evil.com" does not pass for "app.com". The Referer
// only counts when Origin is absent: `Origin: null`, from a sandboxed page, is a refusal.
export function isAllowedOrigin(request: Request, allowedOrigins: readonly string[]): boolean {
  const origin = request.headers.get('Origin') ?? originOf(request.headers.get('Referer'))
  return origin !== null && allowedOrigins.includes(origin)
}
