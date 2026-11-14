// A logout or a password change ends every session of the user, on every device: the server
// records the moment, and a session that started before it is refused wherever it comes from.
// The start is the login, never the last renewal: a session is renewed on every read, so a token
// that slipped through once would otherwise look new forever.

// Times are milliseconds since the epoch. A session with no recorded start comes from before
// this rule existed: it is accepted only while the user has never ended their sessions.
export function isSessionRevoked(sessionStartedAt: number | undefined, sessionsValidAfter: number | undefined): boolean {
  if (sessionsValidAfter === undefined) return false
  if (sessionStartedAt === undefined) return true
  return sessionStartedAt < sessionsValidAfter
}
