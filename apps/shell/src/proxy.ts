import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

// Public routes (/, /forgot-password, /api/auth/*) are allowed simply by NOT
// being included in the matcher below — the middleware never runs on them.
export default auth((req) => {
  const { nextUrl } = req
  const isAuthenticated = !!req.auth

  const isProtected =
    nextUrl.pathname.startsWith('/dashboard') ||
    nextUrl.pathname.startsWith('/transactions')

  if (isProtected && !isAuthenticated) {
    return NextResponse.redirect(new URL('/', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/dashboard', '/dashboard/:path*', '/transactions', '/transactions/:path*'],
}
