# Secure authentication and encryption

Bytebank keeps its own login with Auth.js and JWT sessions. Passwords and reset tokens are stored only as hashes, attachments are encrypted before they reach the database, and every response carries a strict set of security headers.

| Sensitive data | Protection | Where |
|---|---|---|
| Password | scrypt hash with a salt per password, policy of OWASP ASVS 5.0 | `ScryptPasswordHasher`, `passwordPolicy.ts` |
| Session | Signed and encrypted JWT in an `httpOnly` cookie, 30 minutes, ended on the server by "Sair" and by a new password | Auth.js, `sessionPolicy.ts`, `sessionRevocation.ts` |
| Reset token | 32 random bytes, stored as SHA-256, valid for 30 minutes, used once | `RequestPasswordReset`, `ResetPassword` |
| Attachment | AES-256-GCM, bound to its owner | `AesGcmCipher`, `EncryptedAttachmentRepository` |
| Rate-limit counters | HMAC-SHA-256 of the email or IP | `rateLimitKey.ts` |
| Secrets | Outside git, refused at start when missing or weak | `secrets.ts`, `instrumentation.ts` |
| Traffic | HTTPS with HSTS in production, CSP with a nonce | `securityHeaders.ts`, `proxy.ts` of each app |
| Database | Local json-server with no published port; Supabase with RLS and the secret key on the server only | `docker-compose.yml`, [deploy.md](deploy.md) |

## Passwords

### Hashing

scrypt comes with `node:crypto` and is memory-hard, so each guess costs memory as well as time. SHA-256 is too fast for passwords, bcrypt and Argon2id would need a new dependency, and PBKDF2 is cheap to attack with GPUs.

The parameters are the OWASP minimum: `N = 2^17`, `r = 8`, `p = 1`, a 16-byte salt and a 32-byte key. Each hash needs about 128 MiB. The stored value describes its own parameters, so they can grow later without breaking old hashes:

```text
scrypt$N=131072,r=8,p=1$<salt in base64url>$<hash in base64url>
```

`verify` compares with `timingSafeEqual`, answers `false` for anything it cannot parse, and refuses parameters that would need more than 256 MiB. `packages/infrastructure/scripts/hash-password.mjs` hashes a password read from stdin, for the seed. A test checks that the application accepts its output.

### Password policy

The policy follows OWASP ASVS 5.0, chapter 6.2. It applies to new passwords only, in `RegisterUser`, `ResetPassword` and `ChangePassword`, through `hashNewPassword`. The rule lives in the domain (`packages/core/src/domain/user/passwordPolicy.ts`). The screens mirror it and the bff only limits the request size.

| Rule | Value | ASVS 5.0 |
|---|---|---|
| Length | 8 to 128 characters, counted as characters | 6.2.1 |
| Composition | No rule on kinds of characters, since it leads to patterns like `Senha123!` | 6.2.5 |
| Common passwords | The 10,000 most common, a short Portuguese list, and a listed word with digits or symbols around it | 6.2.4 |
| Repetition | One piece repeated, such as `passwordpassword` | 6.2.4 |
| Context | `bytebank`, and parts of the name and email with 3 or more characters | 6.2.11 |
| Normalization | NFKC before hashing | |

The login also normalizes with NFKC but does not apply the policy, so the demonstration password `bytebank123` still works.

**Why 8 and not 15.** NIST SP 800-63B asks for 15 when the password is the only factor. ASVS 5.0 sets 8 as the minimum, and this project follows ASVS. The common-password list (2,087 of its entries have 8 or more characters), the block after 5 wrong attempts and the slow scrypt hash make up the difference.

The English list is `10k-most-common.txt` from [SecLists](https://github.com/danielmiessler/SecLists) by Daniel Miessler and contributors, MIT license, stored in `packages/infrastructure/src/password/common-passwords.json`. It lacks `senha` and the names of football clubs, so `common-passwords-pt.json` adds 34 Portuguese words chosen by hand. A password is also refused when it is a listed word of 4 letters or more with digits or symbols around it, such as `password123`, `senha12345` or `2024brasil!`. Only server code reads the lists, so the screens show a password as common only after the server refuses it.

### Strength indicator

The bar under a new password measures and decides nothing. It estimates the entropy as the counted characters times log2 of the pool size (`packages/design-system/src/password/passwordEntropy.ts`). Lower case and upper case add 26 each to the pool, digits 10, ASCII symbols 32, a space 1, and any other character 32.

Patterns count as one character: a run of 3 or more with one step (`aaaa`, `abc`, `321`, `qwerty`), a repeated piece of 3 or more, and a context word.

| Level | From | Example |
|---|---|---|
| Fraca | below 40 bits | `12345678`, or anything the domain refuses |
| Razoável | 40 bits | 8 random characters with symbols |
| Boa | 60 bits | 11 random letters and digits |
| Forte | 70 bits | 15 random letters and digits, or a passphrase of four words |

The limits come from measuring random passwords: 99.9% of 15-character random passwords reach 70 bits. The estimate knows no dictionary words besides the context, so `password123` can show as fair until the server refuses it. Colors and contrast are in [accessibility.md](accessibility.md#password-strength-colors).

## Login and registration

The only login is in the shell. The zones read the JWT of the shell with the same `NEXTAUTH_SECRET`.

```text
ModalLogin    -> Auth.js -> authorize (shell) -> AuthenticateUser
ModalCadastro -> POST /api/register -> createRegisterHandler -> RegisterUser
                 both use UserRepository (json-server or Supabase) and ScryptPasswordHasher
```

The core holds `User`, the ports and the use cases, and never imports `node:crypto`. Use cases return `UserDTO`, which has no hash. The session carries id, name and email only.

A wrong password and an unknown email get the same answer, and the unknown email still verifies a decoy hash, so both take the same time. The registration answers `202 {"status":"ACCEPTED"}` for a new email and for a registered one, and does not log the person in. `authorize` ignores passwords above 128 characters. Emails are trimmed and lower-cased in the domain.

## Session

| Value | Default | Why |
|---|---|---|
| Session (`maxAge`) | 30 minutes | Limits what a stolen cookie is worth |
| Renewal (`updateAge`) | 5 minutes | How often an active browser renews it |
| Inactivity logout | 10 minutes | Protects a computer left open |
| Warning | 1 minute before | Time to read and answer |

The values live only in `packages/utils/src/sessionPolicy.ts`, read by the three apps. With JWT, Auth.js signs a new token on every read of the session, so `IdleSessionGuard` reads it every `updateAge` while the person is active. Page loads also renew it. The fetches of the router do not ([The session race](#the-session-race)). An expired session sends pages back to the shell, and the zone APIs answer 401.

`IdleSessionGuard` (`packages/design-system/src/session/`) runs in the three apps. Mouse, keyboard, touch, wheel and scroll count as activity, and only "Continuar conectado" counts during the warning. Times come from timestamps, so a background tab or a computer that slept logs out at once. Tabs share the last activity through `localStorage`. The dialog is an `alertdialog` with the focus on its button, and a live region speaks only at 30 and 10 seconds.

`IDLE_TIMEOUT_SECONDS`, `IDLE_WARNING_SECONDS` and `SESSION_MAX_AGE_SECONDS` shorten the times for a demonstration, with no rebuild. A value above the default is ignored. The browser reads them from the public `/api/session-policy` of the shell.

```powershell
$env:IDLE_TIMEOUT_SECONDS = 30; $env:IDLE_WARNING_SECONDS = 15
docker compose up -d --no-deps --force-recreate shell dashboard transactions
```

## Attempt limits

| Limit | Value |
|---|---|
| Login by email | 5 failures in 15 minutes |
| Login by IP | 20 failures in 15 minutes |
| Registration by IP | 10 in 1 hour |
| Reset request | 5 per email and 20 per IP in 15 minutes, apart from the login |
| Password change | Shares the counter of the login by email |

The values are in `packages/bff/src/composition/rateLimits.ts`. `RateLimiter` is a port of the core, because the use case decides whether the password is checked at all. The attempt is counted before the hash and given back on success. The block counts the email as typed, before looking the user up, so an unknown email gets the same block as a real one. A blocked login shows "Muitas tentativas. Tente novamente em X minutos", with the wait sent by the server.

`RATE_LIMIT_WINDOW_SECONDS` shortens the window of the login and of the password change for a demonstration, like the idle times: the 5 attempts stay, and a value above 15 minutes, empty or invalid is ignored. Below one minute the login screen counts down in seconds.

With json-server the limiter lives in memory, with a sliding window per process. With Supabase it is a counter in `rate_limits`, updated by `consume_rate_limit` with the row locked, and shared by every app and instance.

### Keys of the rate limits

A plain SHA-256 of an email is easy to reverse with a list of emails. The key of each counter is an HMAC-SHA-256 (`packages/infrastructure/src/supabase/rateLimitKey.ts`) with a key derived from `NEXTAUTH_SECRET` through HKDF, under its own label (`bytebank/rate-limit-keys/v1`). `createDataAdapters` derives it and passes it to `PostgresRateLimiter`. The hex HMAC still fits the column check, so it needed no migration.

## The session race

With JWT, every answer of `GET /api/auth/session` writes the cookie again. A request carries the cookie the browser had when it left, so an answer that arrives after a write can put the old cookie back. Saving a name could bring the old name back, and leaving could leave the session alive.

Three changes close it:

1. The zones do not read the session on their own. `ZoneSessionProvider` (`packages/auth/src/ZoneSessionProvider.tsx`) reads it on the server and starts the provider with it, without refetching on focus. The writes wait for the reads still in flight (`packages/design-system/src/session/sessionWrites.ts`), and the sign-out checks the session afterwards.
2. The fetches of the router do not renew the session. The router prefetches the menu links right after a page loads, and those requests pass through the proxies of the shell and of the zone, whose `auth()` wrapper wrote a renewed cookie on every answer. In production one of them could answer after the sign-out and revive the session. `keepingSessionOutOfRsc` (`packages/auth/src/rscSessionCookies.ts`) now drops the renewed cookie from those answers. Next removes the RSC headers before the proxy runs, so a router fetch is recognized by `Sec-Fetch-Dest`.
3. "Sair" ends every session on the server ([Ending every session](#ending-every-session)), so any late answer is refused at its next check.

`npm run test:session-race` reproduces the race in a real browser by holding the session reads. In production it went from 6 of 12 checks to 12 of 12 ([testing.md](testing.md#browser-regression-the-session-race)).

## Ending every session

Clearing a JWT cookie only ends the copy in one browser. To end a session for real, the server records when the user ended their sessions and refuses any session that started before.

| Piece | Where |
|---|---|
| The moment, `sessionsValidAfter` | `User` in the core, `db.json`, and `users.sessions_valid_after` in Supabase (`supabase/migrations/0002_sessions_valid_after.sql`) |
| The rule | `isSessionRevoked` in `packages/core/src/domain/user/sessionRevocation.ts` |
| The use cases | `EndUserSessions` and `VerifySession` in the core |
| The start of a session | `sessionStartedAt`, set at login by the `jwt` callback of `baseAuthConfig` (`packages/auth/src/sessionConfig.ts`) |
| The check | The same callback, in the three apps, on every read of the session. It returns `null`, so Auth.js answers no session and clears the cookie |
| "Sair" | `POST /api/sessions/end` of the shell, called by `signOutEverywhere` before the cookie is cleared |
| Inactivity logout | `signOutCompletely`, which only clears the cookie of its browser |
| New password | `ChangePassword` and `ResetPassword` record the moment after saving the hash |

"Sair" logs the person out of every device. The inactivity logout only ends its own browser, so a tab forgotten on another computer does not log out the phone. A new password ends every session, including the current one, so the account page tells the person to log in again and takes them to the login.

The check compares the login time, not `iat`. Auth.js signs a new token on every read, so a token that passed one check would get a fresh `iat` and stay valid forever.

Every check of a session costs one read of the user, with no cache, so a logout takes effect at once in every app and instance. If the database does not answer, the callback fails and Auth.js clears the cookie.

## Account

"Minha conta" changes the name (`PATCH /dashboard/api/account/profile`) and the password (`POST /dashboard/api/account/password`). The email is read only, because changing it would need a confirmation email. Both routes check the `Origin` before the session, take the user from the session, and refuse extra fields.

`ChangePassword` consumes one attempt of the login limiter, verifies the current password in constant time, refuses an unchanged password (`PASSWORD_UNCHANGED`), applies the policy and ends every session. A wrong current password answers `422 INVALID_CURRENT_PASSWORD`, because the client reads 401 as an expired session.

After a name change the screen calls `update()` of Auth.js. The `jwt` callback reads the name again from the database by the id of the token and ignores what the browser sends.

## Password recovery

1. `/forgot-password` always answers "Se o e-mail estiver cadastrado, enviamos um link". The answer leaves before the work starts, so its time does not depend on the email.
2. The server stores only the SHA-256 of a 32-byte random token, with the user, an expiry of 30 minutes and whether it was used. Older tokens of the user stop working.
3. The link uses `SHELL_URL`, never the `Host` of the request.
4. `/redefinir-senha` removes the token from the address bar when it opens.
5. On success the token is claimed, the hash is saved, every session ends and the login attempts of the email are cleared. With Supabase the claim is one atomic statement, so a link works once even under concurrency.

An expired, used or unknown token gets one message with a link to ask again. A password refused by the policy does not use up the token.

Docker runs Mailpit, with the inbox at http://localhost:8025. Outside Docker, `SMTP_HOST` must be `127.0.0.1`: Node resolves `localhost` to `::1` first, and a Mailpit published on `127.0.0.1` refuses it. Without `SMTP_HOST` the shell uses `DisabledEmailSender`, which logs one line with no address. Production sends no email ([deploy.md](deploy.md#no-email-in-production)).

## Attachments

`AesGcmCipher` implements the `DataCipher` port with `node:crypto`. `EncryptedAttachmentRepository` wraps the real repository, so the use cases do not change.

```text
aes256gcm$v1$<IV, 12 bytes>$<auth tag, 16 bytes>$<data>
```

Each attachment gets a random IV. The user id is authenticated data, so a value copied to another user's transaction does not open. The inner repository filters by owner before anything is decrypted. A value that fails to open is never shown in the clear: the transaction comes back with `attachmentUnavailable: true` and the screen shows "Anexo indisponível", while it can still be edited and deleted.

The cipher encrypts the bytes of the file, not the data URL. Encrypting the data URL would apply base64 twice and push a 70 KB file above the body limit of json-server ([ADR 0009](../adr/0009-attachment-size-limit.md)). The key is `ATTACHMENT_ENCRYPTION_KEY`, 32 bytes in base64, in the zones only. Changing it makes the stored attachments unreadable. The allowed types are PNG, JPEG, WebP and PDF; SVG is refused because it can carry scripts.

## Security headers and CSP

`next.config.ts` sends `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy` on every response of the three apps (`packages/utils/src/securityHeaders.ts`). HSTS goes out only when `VERCEL_ENV` is `production`, the one environment where HTTPS is certain.

Each `proxy.ts` sends the Content-Security-Policy with a new nonce per request:

```text
default-src 'self';
script-src 'self' 'nonce-<random>' 'strict-dynamic';
style-src 'self';
img-src 'self' data:;
frame-src data:;
font-src 'self';
connect-src 'self';
object-src 'none';
base-uri 'none';
form-action 'self';
frame-ancestors 'none'
```

Each app sends its own policy, because a second policy with another nonce would block the scripts of a zone. The nonce exists only per request, so no page is static ([performance.md](performance.md#no-page-is-static)). `img-src data:` and `frame-src data:` exist for attachments, which reach the screen as data URLs. There is no exception for inline styles. Development adds `'unsafe-eval'`, `ws:` and inline styles for fast refresh.

## Secrets

`NEXTAUTH_SECRET` signs and encrypts the sessions, and `ATTACHMENT_ENCRYPTION_KEY` encrypts the attachments. Locally they live in `.env` or in the `.env.local` of each app, outside git and outside the images. In production they are Vercel variables.

`packages/utils/src/secrets.ts` refuses a missing value, the `replace-me` of the examples, or anything that is not base64 of 32 bytes or more:

```text
Missing or invalid NEXTAUTH_SECRET. Generate 32 random bytes in base64, as in step 3 of the README
```

The `secrets-check` service of Docker Compose runs this rule before any app starts. Every server also runs it at start in `instrumentation.ts`, in Docker, `npm run dev` and Vercel, and stops the process instead of answering 500 to every request.

## Server-only entries

Server code must never reach a browser bundle, because it holds the database adapters, the Supabase secret key and the attachment cipher. Three barriers keep it out.

`packages/bff/src/index.ts` and the server files of `@bytebank/auth` (`zoneHandlers.ts`, `zone.ts`, `zoneProxy.ts`, `ZoneSessionProvider.tsx`) import `server-only`, so a Client Component that reaches them fails `next build`. Importing `@bytebank/bff` into `CardNewTransaction.tsx` proved it: the build failed with "You're importing a module that depends on "server-only"". `@bytebank/bff/client` runs in the browser, and `@bytebank/infrastructure` is also used by Node scripts, so neither imports it. `vitest.config.mts` maps `server-only` to its empty module for the unit tests.

The layer rules of `eslint.layers.mjs` forbid `store` and `design-system` from importing `@bytebank/infrastructure` or `@bytebank/bff`, except `@bytebank/bff/client` ([conventions.md](../conventions.md#layers)).

No component calls the bff with a bare `fetch`. The zones use `createTransactionsClient` and the shell uses `createShellClient`, both from `@bytebank/bff/client`.

## Personal data in logs

Database errors name the collection, never the email or the user id. Auth.js used to log the content of an expired token, with name and email, so `authLogger` now logs only the error name and message. The loggers of the bff never log a request body.

## How to validate

| What | How |
|---|---|
| Policy, hasher, cipher, limiter, HMAC keys, revocation | `npm test` ([testing.md](testing.md)) |
| Login block | Log in with an unknown email and wrong passwords: the 6th attempt is blocked for 15 minutes |
| Recovery | "Esqueci a senha" with `julia@bytebank.com`, then the email in Mailpit |
| CSP | The response has `Content-Security-Policy` with a nonce, and the console shows no violation |
| HSTS | `curl -sI https://bytebank-shell.vercel.app/ \| grep -i strict-transport-security` |
| Secrets | `NEXTAUTH_SECRET=replace-me docker compose up -d` stops at `secrets-check` |
| Session race | `npm run test:session-race` |
| What each logout ends | `npm run test:logout-scope`, with short idle times |
| Server-only | Import `@bytebank/bff` in a Client Component and the build fails |

## Known limits

- "Sair" logs out every device of the person, not only the current one.
- A copy of the cookie of someone who left by inactivity stays valid until it expires, 30 minutes at most.
- If "Sair" cannot reach the server, only the current browser leaves.
- Every check of a session reads the user, and a database outage logs everyone out.
- The reset token travels in a link, so whoever reads the email can use it for 30 minutes.
- A failed email looks sent to the person, and no email warns about a changed password.
- An 8-character password that is not on the list, such as a name and a year, is accepted.
- Someone can register a known email with a password of their choice and learn from the login whether it already existed. Only a confirmation email would close this.
- A blocked login says so and answers faster, which shows that an email reached the limit, not that it exists.
- Someone can lock an account for 15 minutes with 5 wrong passwords.
- The limit by IP trusts `x-forwarded-for`. Vercel sets it, but in Docker a client can send any value.
- With json-server, two simultaneous registrations of one email or two uses of one reset link can both pass, and each app counts attempts on its own.
- Key rotation is prepared by the `v1` in the format, not built.
- Attachments are decrypted on every read, the balance included.
- An old secret and the plain-text passwords of the first seed remain in the git history. Neither is used.

## Next phase

- Run the Storybook tests, `test:session-race` and `test:logout-scope` in CI.
- Delete expired reset tokens and old rows of `rate_limits` with a scheduled job.
- Cache the adapters that `/sobre` and the name refresh build on every request.
- Make the lazy modals load in Storybook ([testing.md](testing.md#storybook)).
