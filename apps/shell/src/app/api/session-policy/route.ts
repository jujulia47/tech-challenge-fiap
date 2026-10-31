import { readSessionPolicy } from '@bytebank/utils'

export const dynamic = 'force-dynamic'

// Public and with no secret: the same numbers are in the source code.
// Read at run time, so shorter times for a demonstration need no rebuild.
export function GET() {
  const { idleTimeoutSeconds, idleWarningSeconds, updateAgeSeconds } = readSessionPolicy(process.env)
  return Response.json(
    { idleTimeoutSeconds, idleWarningSeconds, updateAgeSeconds },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
