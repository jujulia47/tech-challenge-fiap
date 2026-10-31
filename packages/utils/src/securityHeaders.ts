// No imports on purpose: next.config.ts reads this file directly, before anything is bundled.
// Why each directive: docs/fase4/security.md
const STATIC_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
]

const HSTS = { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }

// HSTS tells browsers to refuse plain HTTP, so it can only go out where HTTPS is certain
export function securityHeaders(isHttpsProduction: boolean): { key: string; value: string }[] {
  return isHttpsProduction ? [...STATIC_HEADERS, HSTS] : STATIC_HEADERS
}

export function contentSecurityPolicy(nonce: string, isDevelopment = false): string {
  return [
    "default-src 'self'",
    // 'strict-dynamic' lets the scripts with the nonce load the chunks of Next.js.
    // Development needs eval for fast refresh.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDevelopment ? " 'unsafe-eval'" : ''}`,
    `style-src 'self'${isDevelopment ? " 'unsafe-inline'" : ''}`,
    // Attachments are shown as data URLs: images in <img> and PDFs in <iframe>
    "img-src 'self' data:",
    'frame-src data:',
    "font-src 'self'",
    `connect-src 'self'${isDevelopment ? ' ws:' : ''}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

// The request needs the policy too: Next.js reads the nonce from it and puts it on its own scripts
export function withContentSecurityPolicy(headers: Headers): { requestHeaders: Headers; policy: string } {
  const nonce = btoa(crypto.randomUUID())
  const policy = contentSecurityPolicy(nonce, process.env.NODE_ENV === 'development')
  const requestHeaders = new Headers(headers)
  requestHeaders.set('Content-Security-Policy', policy)
  return { requestHeaders, policy }
}
