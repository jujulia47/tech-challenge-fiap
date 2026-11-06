# ADR 0010: Supabase as the production database

**Status:** Accepted (2026-11-06)

## Context

json-server is a good backend for development: no setup, a file that resets, and the repositories that talk to it are already tested. It is not a database for production. It has no transaction, no unique index, no atomic update and no access control, so it cannot keep two registrations of one email apart, use a reset link only once under concurrency, or share a rate limit between the shell and the zones. The in-memory limiter is per process, which step 7b recorded as an open item.

The mobile app of the challenge uses Firebase Authentication. The web keeps its own login (scrypt, Auth.js, the limits of step 3.2), and the two apps do not share accounts. So the web database does not have to be Firebase, and choosing it to "share" with the mobile would bring nothing.

## Decision

**Supabase, as a Postgres database only**, behind the same ports of the core.

- **Only the database.** No Supabase Auth, no Storage, no Realtime. The login stays ours, and the attachments stay encrypted in a column, as in json-server.
- **The same ports.** `SupabaseUserRepository`, `SupabaseTransactionRepository`, `SupabasePasswordResetTokenRepository` and `PostgresRateLimiter` implement the ports of the core. The use cases, the handlers of the bff and the screens do not change.
- **Chosen by an environment variable.** `DATA_BACKEND` is `json-server` by default and `supabase` in production, read in one place of the bff (`createDataAdapters`).
- **The guarantees live in the database.** A unique index on `lower(email)`, a function that claims a reset token in one statement, and a function that counts an attempt with the row locked. They hold however many instances of the apps are running.
- **The secret key, on the server only.** RLS is on in every table with no policy, and the `anon` and `authenticated` roles have no grant. The publishable key reads nothing.
- **Versioned SQL.** `supabase/migrations/0001_init.sql`, run in the SQL Editor of the project.

## Alternatives

- **Firestore.** It fits the mobile, but the web has no use for its auth, and a unique email needs a second collection written in a transaction. The rate limit would need a transaction per attempt.
- **A Postgres of our own** (Railway, Neon). The same SQL would work, but the project would host and secure the database itself. Supabase gives the same Postgres with backups and an admin panel.
- **Supabase Auth.** It would replace the login of step 3, with its tests and limits, and the users would move to another table. The gain does not pay for it.

## Consequences

- Two backends to keep. One contract suite per port runs against both; the Supabase one runs only with `SUPABASE_CONTRACT_TESTS=1`, out of the CI.
- Some guarantees exist only in Supabase: the unique email under concurrency and the single use of a reset link under concurrency. json-server says so in the contract suite, where those cases are skipped.
- `ResetPassword` claims the token before it changes the password. Before, it changed the password first, which a single-use claim in the database could not protect.
- The fixed window of the Postgres limiter can give a countdown a little longer than the sliding window of the memory limiter.
- The secret key bypasses RLS: if it leaks, the database is open. It lives in the environment of the server, never in a `NEXT_PUBLIC_` variable, and a test of the build checks that no Supabase code reaches the browser.
