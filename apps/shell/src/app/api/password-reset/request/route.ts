import { getPasswordResetHandlers } from '@/server/passwordResetHandlers'

export const dynamic = 'force-dynamic'

export function POST(request: Request) {
  return getPasswordResetHandlers().request(request)
}
