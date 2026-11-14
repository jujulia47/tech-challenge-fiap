# Secure authentication and encryption

Requirements: secure authentication and encryption of sensitive data. Bytebank keeps its own login (Auth.js with JWT sessions), stores passwords and reset tokens only as hashes, encrypts attachments before they reach the database, and sends a strict set of security headers.

| Sensitive data | Protection | Where |
|---|---|---|
| Password | scrypt hash, one salt per password, policy of OWASP ASVS 5.0 | `ScryptPasswordHasher`, `passwordPolicy.ts` |
| Session | JWT signed and encrypted by the server, in an `httpOnly` cookie, 30 minutes, logout of this browser after 10 minutes idle, every session ended on the server by "Sair" and by a new password | Auth.js, `sessionPolicy.ts`, `IdleSessionGuard`, `sessionRevocation.ts` |
| Reset token | 32 random bytes, stored as SHA-256, 30 minutes, single use | `RequestPasswordReset`, `ResetPassword` |
| Attachment | AES-256-GCM, tied to its owner, key in a server variable | `AesGcmCipher`, `EncryptedAttachmentRepository` |
| Rate-limit counters | HMAC-SHA-256 of the email or IP, never the value itself | `rateLimitKey.ts` |
| Secrets | `.env` outside git, refused at start when missing or weak | `secrets.ts`, `docker-compose.yml`, `instrumentation.ts` |
| Traffic | HTTPS with HSTS in production, CSP with a nonce | `securityHeaders.ts`, `proxy.ts` of each app |
| The database | Local json-server with no published port; Supabase with RLS and the secret key on the server only | `docker-compose.yml`, [deploy.md](deploy.md) |

## Passwords

### Hashing: why scrypt

| Option | Decision |
|---|---|
| SHA-256 and similar | No. They are fast by design, which is what an attacker with a stolen database wants |
| bcrypt, Argon2id | Good, but both need a new dependency. Argon2id is the first choice of OWASP when one is available |
| PBKDF2 | Available in `node:crypto`, but it needs little memory, so GPUs attack it cheaply |
| scrypt | In `node:crypto`, with no dependency, and memory-hard: each guess costs memory as well as time |

`N = 2^17`, `r = 8`, `p = 1`, the OWASP minimum for scrypt. Each hash needs about 128 MiB and takes about 250 ms in the shell container. Salt: 16 random bytes per password. Key: 32 bytes.

```text
scrypt$N=131072,r=8,p=1$<salt in base64url>$<hash in base64url>
```

The hash describes itself, so the parameters can grow later: `verify` reads the parameters stored with each hash, so old hashes keep working. It answers `false` for anything it cannot read, and refuses parameters that would need more than 256 MiB, so a damaged record cannot ask the server for gigabytes. The comparison uses `timingSafeEqual`.

`packages/infrastructure/scripts/hash-password.mjs` generates a hash for the seed. It reads the password from stdin, to keep it out of the shell history (`node packages/infrastructure/scripts/hash-password.mjs < file-with-the-password`). It repeats the parameters of `ScryptPasswordHasher`, because it has no dependency, and a test proves that the application accepts what it prints.

### Password policy

It follows OWASP ASVS 5.0, chapter 6.2, and applies to new passwords only: `RegisterUser`, `ResetPassword` and `ChangePassword`, all through `hashNewPassword`. **The rule is in the domain** (`packages/core/src/domain/user/passwordPolicy.ts`). The BFF only limits the size of the request, and the screens mirror the rule.

| Rule | Value | ASVS 5.0 | Why |
|---|---|---|---|
| Length | 8 to 128 characters | 6.2.1: at least 8, 15 recommended | Counted in characters, so an emoji counts as one |
| Composition | None | 6.2.5: no rule on kinds of characters | It leads to predictable patterns, such as `Senha123!` |
| Common passwords | The 10,000 most common, a short list in Portuguese, and a listed word with digits or symbols around it | 6.2.4: checked against the most common passwords | Checked before the length, so `password` says what is wrong with it |
| Repetition | One piece repeated, such as `passwordpassword` | 6.2.4 | Repetitive values are as easy to guess as the piece |
| Context | `bytebank`, and parts of the name and of the email with 3 or more characters | 6.2.11: words of the context | The first guesses of anyone who knows the person |
| Normalization | NFKC before the hash | | Two spellings of one character must give one password |

The login also normalizes with NFKC, or a password with such a character could never log in again. The passwords that already exist are ASCII, so nothing changes for them. The login does not apply the policy, so `bytebank123`, the password of the demonstration, still works.

**Why 8 and not 15.** NIST SP 800-63B rev. 4 asks for 15 when the password is the only factor, as it is here, and the first version of the policy used 15. ASVS 5.0 sets 8 as the minimum and recommends 15, and this project follows ASVS. The distance to NIST is made up for by:

- **the list of common passwords**, which does most of the work: 2,087 of its 10,000 entries have 8 characters or more, and the word-and-digits rule covers `password123`, `senha12345` and the like;
- **the block after 5 wrong attempts** in 15 minutes, by email and by IP, which keeps an online attack to a few guesses;
- **the scrypt hash**, which makes each guess slow if the database leaks.

**The list.** `10k-most-common.txt` from [SecLists](https://github.com/danielmiessler/SecLists), by Daniel Miessler and contributors, MIT license, is in `packages/infrastructure/src/password/common-passwords.json`, in lower case. It is in English: `senha` and the names of football clubs are not in it, so `common-passwords-pt.json` adds 34 Portuguese words (4 of them were already in the English list), chosen by hand for this project and not taken from a measured source. A password is also refused when what is left after removing the digits and symbols around it is a listed word of 4 letters or more: `password123`, `senha12345`, `2024brasil!`. Shorter words are left alone, so a random password does not fail on three letters that happen to make a word. Only server code reads the lists.

**The screens do not have the list.** They check the length, the repetition and the context words, and they show a password as common only after the server refuses it.

### Strength indicator

The bar under a new password measures; it does not decide. A password the domain accepts may show as weak, and one it refuses always shows as weak. The indicator adds no rule of composition.

It estimates the entropy: the characters that count, times log2 of the size of the pool of characters used (`packages/design-system/src/password/passwordEntropy.ts`).

| Class in the password | Adds to the pool |
|---|---|
| Lower case `a-z` | 26 |
| Upper case `A-Z` | 26 |
| Digits | 10 |
| ASCII symbols | 32 |
| Space | 1 |
| Anything else (accents, other scripts, emoji) | 32, a low guess |

Discounts, so that a pattern counts as one character:

- **A run of 3 or more with one step:** the same character (`aaaa`), the next or the previous one (`abc`, `321`), or the next key on the keyboard (`qwerty`, `asdf`, `7890`). Case does not matter. A change of direction (`aba`) is not a run, and two in a row are left alone: random passwords have those by chance.
- **A piece of 3 or more that already appeared** (`Xk9mXk9m`).
- **A word of the context**, the same words the domain refuses.

| Level | From | Example |
|---|---|---|
| Fraca | below 40 bits | `aaaaaaaaaa` (5 bits), `12345678` (3 bits), anything the domain refuses |
| Razoável | 40 bits | 8 random characters with symbols, about 52 bits |
| Boa | 60 bits | 11 random letters and digits, about 65 bits |
| Forte | 70 bits | 15 random letters and digits, about 89 bits |

The limits were chosen on measurements: of 20,000 passwords of 15 random letters and digits, as the password manager of Google makes them, 99.9% reach 70 bits even with a run in them by chance. A passphrase of four words also reaches Forte. The estimate is rough by design: it knows no dictionary words other than the context, so `password123` can show as fair until the server refuses it, and then it shows as weak.

Colors and contrast: [accessibility.md](accessibility.md#password-strength-colors).

## Authentication

### Login and registration

```text
ModalLogin        -> Auth.js -> authorize (shell) -> AuthenticateUser ---+
ModalCadastro     -> POST /api/register -> createRegisterHandler -> RegisterUser
                                                                         |
                          UserRepository: json-server or Supabase adapter
                          PasswordHasher: ScryptPasswordHasher (node:crypto)
```

- `@bytebank/core` has the `User` entity, the `UserRepository` and `PasswordHasher` ports, and the use cases. It does not import `node:crypto`.
- Use cases return `UserDTO`, which has no hash. The session holds id, name and email only.
- The only login is in the shell. The zones have no provider: they read the JWT of the shell with the same `NEXTAUTH_SECRET`.

| | Before Phase 4 | Now |
|---|---|---|
| Stored password | Plain text in the seed and in `db.json` | Only a scrypt hash, in `passwordHash` |
| `authorize` | 3 copies: shell, dashboard, transactions | 1, in the shell, calling `AuthenticateUser` |
| Password check | `user.password !== password` in each copy | `ScryptPasswordHasher.verify`, with `timingSafeEqual` |
| Unknown email | No password comparison, so it answered faster | Verifies a decoy hash, so it takes the same time |
| Registration | Created nothing: it checked the terms and redirected | `POST /api/register`, validated with Zod and an Origin check, calling `RegisterUser` |
| Session | id, name, email | The same: no hash, no password |

**Not revealing which emails exist.**

- **Login:** a wrong password and an unknown email give the same `INVALID_CREDENTIALS`, response and message. For an unknown email, `AuthenticateUser` verifies a decoy hash made with the same parameters. Measured at the endpoint in Docker Compose, with 80 failed logins in random order: a median of 249 ms for two existing emails, and of 249 ms and 250 ms for two unknown ones, with one identical response.
- **Registration:** `/api/register` answers `202 {"status":"ACCEPTED"}` for a new email and for a registered one, and the screen shows the same text. So the registration does not log the person in: an automatic login would tell the two cases apart.

**Registration rules.** The name has from 1 to 100 characters, and the password follows the policy above. `authorize` ignores passwords above 128 characters, so a huge value never reaches the hash. Emails are trimmed and stored in lower case, in the domain. The Origin check is the one of the BFF ([bff.md](bff.md#csrf)), before the body is read.

### Session

| Value | Default | Why |
|---|---|---|
| Session (`maxAge`) | 30 minutes | Limits what a stolen cookie is worth. A bank session should not last the 30 days of the Auth.js default |
| Renewal (`updateAge`) | 5 minutes | How often the browser renews the session while in use |
| Inactivity | 10 minutes | Protects a computer left open. Shorter than the session, so that the person is warned and leaves on purpose |
| Warning | 1 minute before | Enough time to read and answer |

The values are in `packages/utils/src/sessionPolicy.ts`, the only place with them, read by the three apps: a zone that renews the session writes the cookie with its own `maxAge`.

- **`updateAge` does nothing in Auth.js with JWT.** It only applies to database sessions: with JWT, every read of the session issues a new token. The API routes read the session but cannot set cookies, so someone working on one screen would never renew it. `IdleSessionGuard` reads the session every `updateAge` while there is activity.
- **An expired session:** the proxies lead pages to the shell, and the zone APIs answer 401.
- **Tolerance:** Auth.js accepts a token up to 15 seconds after it expires (`clockTolerance`), so a 30-minute session ends at 30 minutes and 15 seconds.
- **What renews it:** page loads (through the proxies) and the reads of the session. The fetches of the router do not, since they are what wrote the old cookie back after a logout ([The session race](#the-session-race)).

**Inactivity.** `IdleSessionGuard` (`packages/design-system/src/session/`) runs in the three apps. Its timing logic, `idleMonitor.ts`, has no React and no browser API, so it is tested with simulated time.

- Mouse, keyboard, touch, wheel and scroll count as activity. During the warning only "Continuar conectado" counts, or a moved mouse would hide the warning before anyone read it.
- Times come from timestamps, not from counting ticks: background tabs have slow timers, and a computer that slept must log out at once.
- Tabs share the last activity through `localStorage` and its `storage` event. All zones share the origin of the shell, so this reaches every tab of the app. It holds only a timestamp.
- The dialog has `role="alertdialog"`, with the focus on the button. The visible countdown is hidden from screen readers, and a live region speaks only at 30 and at 10 seconds.
- This logout runs in the browser. With every tab closed, the `maxAge` of the server ends the session.

**Shortening the times for a demonstration.** `IDLE_TIMEOUT_SECONDS`, `IDLE_WARNING_SECONDS` and `SESSION_MAX_AGE_SECONDS` are read when the app runs, so no rebuild is needed. They can only shorten: a value above the default, or one that is not a positive integer, is ignored. The browser reads them from `/api/session-policy`, on the shell, which is public and has no secret. In PowerShell:

```powershell
$env:IDLE_TIMEOUT_SECONDS = 30
$env:IDLE_WARNING_SECONDS = 15
docker compose up -d --no-deps --force-recreate shell dashboard transactions
# back to the defaults
Remove-Item Env:IDLE_TIMEOUT_SECONDS, Env:IDLE_WARNING_SECONDS
docker compose up -d --no-deps --force-recreate shell dashboard transactions
```

Outside Docker, the same variables go in `apps/shell/.env.local` (and `SESSION_MAX_AGE_SECONDS` also in the `.env.local` of each zone).

### Attempt limits

| Limit | Value | Why |
|---|---|---|
| Login by email | 5 failures in 15 minutes | Stops password guessing against one account, without punishing a typing mistake |
| Login by IP | 20 failures in 15 minutes | Stops one origin from trying many accounts. Higher, because many people can share one address |
| Registration by IP | 10 in 1 hour | Each registration costs one scrypt hash and creates a record |
| Reset request | 5 per email and 20 per IP in 15 minutes | Counted apart from the login. Over the limit the answer is the same and no email goes out |
| Password change | Shares the counter of the login by email | 5 guesses spread over the login and "Minha conta" still block |

The values are in `packages/bff/src/composition/rateLimits.ts`. `RateLimiter` is a port of the core, because the rule belongs to the use cases: it decides whether the password is even checked, so it runs before the hash.

- The attempt is counted before the hash and given back on success. Counting afterwards would let parallel attempts all pass the check. A success gives back only its own attempt, and a failure of the backend gives it back too.
- **The block does not reveal which emails exist.** It counts failures per email as typed, decided before the user is looked up, so an unknown email gets the same block and countdown as a real one.
- A wrong password and an unknown email give the same message. A blocked login gives another: "Muitas tentativas. Tente novamente em X minutos". The wait comes from the server, in the `code` that Auth.js hands to the browser. The counter on the screen changes every minute and enables the button when the wait ends; a screen reader hears only the first message. Changing the email enables the button, because the block applies to the email typed.

**Two adapters, chosen with the database.**

| Backend | Adapter | Behavior |
|---|---|---|
| json-server (local) | `InMemoryRateLimiter` | A sliding window per process. A refused attempt does not count, so it does not extend the block. A restart forgets everything (`docker compose restart shell` clears it), and each app counts on its own |
| Supabase (production) | `PostgresRateLimiter` | A fixed window in the table `rate_limits`, counted by the function `consume_rate_limit` with the row locked, so parallel attempts are counted one by one. Shared by every app and instance, so the login of the shell and the password change of the dashboard share one count |

The fixed window of Postgres can give a countdown a little longer than the sliding window of the memory limiter.

### Keys of the rate limits

With Supabase, each counter is a row of `rate_limits`. A plain SHA-256 of `namespace:email` is not anonymous: anyone with the table and a list of emails can hash each one and find the rows. The key is an HMAC-SHA-256 (`packages/infrastructure/src/supabase/rateLimitKey.ts`):

- **The HMAC key** is derived from `NEXTAUTH_SECRET` with HKDF of `node:crypto` and its own label (`bytebank/rate-limit-keys/v1`), so it is never the key that signs and encrypts the sessions, and no new variable is needed.
- **It reaches the adapter through the composition of the bff:** `createDataAdapters` derives it and gives it to `PostgresRateLimiter`. The adapter does not read the environment.
- **No migration.** An HMAC in hex has 64 characters, so it still passes the check of the column (`^[0-9a-f]{64}$`). Rows made with the earlier SHA-256 keys are no longer found, and they expire with their window.

The memory limiter keeps no key anywhere, so it does not use the HMAC.

### The session race

Found by the first test of the production deployment, and fixed.

**The problem.** Every answer of `GET /api/auth/session` writes the session cookie again: with JWT sessions, Auth.js signs a new token on each read. A read carries the cookie the browser has when it leaves, so a read that leaves before a write and answers after it stores the old token over the new one:

- **Saving the name:** the `POST` of `update()` writes a token with the new name, and the late read puts the old name back, in the header and in the cookie.
- **Logging out:** the sign-out clears the cookie, and the late read writes it back. The user lands on the login, but `/dashboard` opens with no password.

The reads came from the session provider of the zones (on page load and when the window gets the focus) and from the renewal of the inactivity guard. Locally the answers take milliseconds and the window is too short to hit. In production every answer crosses to `iad1`, and a cold function takes seconds.

**Evidence.** `apps/shell/scripts/session-race.mjs` holds the session reads in the browser for 3 s after the server answered, so the request is real and only its arrival is late. Against production before the fix, 8 of 8 checks failed: the header and the session went back to the old name, and after the logout `/dashboard` still opened. After the fix, 12 of 12 passed in Docker ([testing.md](testing.md#browser-regression-the-session-race)).

**The first fix**, so that no write is left with a read behind it:

1. **The zones do not read the session on their own.** `ZoneSessionProvider` (`packages/auth/src/ZoneSessionProvider.tsx`) reads the session on the server, in the layout, and starts the provider with it, with `refetchOnWindowFocus` off. The layouts were already rendered per request for the nonce, so this costs one decode of the JWT and no query, and the name is in the header from the first paint.
2. **The writes wait for the reads.** The only read left is the renewal of the inactivity guard, which goes through `readSession` (`packages/design-system/src/session/zoneSession.ts`) and is tracked while in flight. `signOutCompletely`, used by the inactivity logout and, after the server ended every session, by "Sair" (`signOutEverywhere`), waits for the reads, signs out, and reads the session to check; if a read from elsewhere brought it back, it signs out once more. The form of the name calls `waitForSessionReads` before `update()`.

This fixed the name in production, but not the logout. On 2026-11-14 the regression test against production passed 6 of 6 on the name and failed 6 of 6 on the logout, while Docker passed 12 of 12.

**The cause of the logout, found by recording every request after the click.** A Playwright run with the Chrome DevTools Protocol logged each request with its initiator and each `Set-Cookie` (names only), in production and in Docker:

- After a page loads, the router of Next prefetches the links of the menu (`/dashboard/investments`, `/dashboard/services`, `/dashboard/account`, `/dashboard/coming-soon`) with RSC fetches, in two waves.
- Those fetches go through `proxy.ts` of the shell (its matcher covers `/dashboard/*`) and of the zone. Both are `auth(...)` of next-auth, whose `handleAuth` reads the session on every request and copies the renewed session cookie to the response. Each prefetch answered with a new `session-token`.
- In production each answer takes about 200 ms. In a failing run, the click on "Sair" came at +0 ms; the prefetch of `/dashboard/investments` left at +148 ms with the old cookie; the `POST /dashboard/api/auth/signout` left at +197 ms; the signout answer cleared the cookie at +353 ms; **the prefetch answered at +354 ms and wrote the session back**. The next read of the session, at +355 ms, already carried it, and the server renewed it from then on. In the runs that passed, the prefetches answered before the signout (for example +324 and +326 ms against +346 ms): the order of the answers decided.
- In Docker the same two waves end about 280 ms after the page loads, each answer in about 25 ms, before the user can click: nothing is in flight at the logout. That is why the local runs always passed.

**The second fix: the router fetches do not renew the session.** `keepingSessionOutOfRsc` (`packages/auth/src/rscSessionCookies.ts`) wraps the proxies of the shell and of the zones and removes a renewed session cookie from the answer to a fetch, keeping a cookie being cleared. Next removes the RSC headers (`RSC`, `Next-Router-Prefetch`) and the `_rsc` parameter before the proxy sees the request, so the fetch is recognised by `Sec-Fetch-Dest`, which the browser sets and the page cannot forge (`empty` on a fetch, `document` on a page load), with the RSC headers as a fallback. Page loads and the reads of the session still renew it. After this, no RSC answer carried a `session-token` in the recording.

**The third fix, which does not depend on the order of anything: "Sair" ends every session on the server** ([below](#ending-every-session)). A cookie written back by any late answer is refused at its next check.

### Ending every session

A JWT session lives in the cookie, so clearing the cookie only ends the copy in that browser. To end a session for real, the server records when the user ended their sessions, and refuses a session that started before that moment.

| Piece | Where |
|---|---|
| The moment, `sessionsValidAfter` (date and time) | `User` in the core; `sessionsValidAfter` (ISO) in `db.json`; `sessions_valid_after timestamptz` in Supabase (`supabase/migrations/0002_sessions_valid_after.sql`) |
| The rule: a session that started before the moment is refused; with no moment, every session is valid | `isSessionRevoked` in `packages/core/src/domain/user/sessionRevocation.ts` |
| The use cases | `EndUserSessions` (records now) and `VerifySession` (one read of the user), in the core |
| The writes | `updateSessionsValidAfter` in `HttpUserRepository` and `SupabaseUserRepository`, with a contract suite for both |
| When the session started | `sessionStartedAt`, put in the token at the login by the `jwt` callback of `baseAuthConfig` (`packages/auth/src/sessionConfig.ts`) |
| The check | The same `jwt` callback, in the three apps, on every read of the session: it returns `null`, and Auth.js answers no session and clears the cookie |
| "Sair" of the menu | `POST /api/sessions/end` of the shell (`createEndSessionsHandler` in the bff), called by `signOutEverywhere` (`packages/design-system/src/session/sessionWrites.ts`) before the cookie is cleared. The zones reach it on the origin of the shell. It checks the `Origin` before the session, like the other writes |
| The inactivity logout | `signOutCompletely`: the sign-out of Auth.js only, which clears the cookie of this browser and records nothing. The config has no `signOut` event |
| A new password | `ChangePassword` and `ResetPassword` record the moment after saving the hash |
| The composition | `getSessionRevocation()` in `@bytebank/bff`, given to the three apps |

**What it means for the user:**

- **"Sair" ends the sessions of every device** of the user, not only this browser.
- **The inactivity logout ends only the session of its own browser.** A tab forgotten on another computer that times out does not log the person out of the phone. The two are separate on purpose: leaving is a decision of the person, and a timeout is not.
- **A new password ends every session, this one included**, which closes the open item of the account page: whoever had the old password, or a session made with it, is out. The account page says "Senha alterada. Entre de novo com a nova senha." and takes the person to the login after 2.5 s. A reset by email does the same.
- **A copy of the cookie stops working at once**, including one written back by a late answer, a stolen one, or another tab.

**Why the start of the session, not `iat`.** Auth.js signs the token again on every read, with a new `iat`. Comparing `iat` would let a token that slipped through one check come back with a new date and stay valid forever. `sessionStartedAt` is set at the login and never changes, so an old session stays old.

**The cost: one read of the user per check of a session**, in every app: the proxies on each page and each RSC fetch, each read of the session, each API request. There is no cache, on purpose: a logout must hold at once in every app and instance, and a cache per instance would let another instance accept the old session for its duration. With json-server it is one local HTTP request; with Supabase, one query in the same region as the functions (`iad1`).

**Failing closed.** If the database does not answer, the callback throws, and Auth.js logs the error and clears the cookie: the person logs in again rather than keep a session that cannot be checked.

**Proof**, in Docker with the new code:

| Check | Result |
|---|---|
| A copy of the session cookie, taken before the logout and put back after it | Refused by the shell and by the zone; the read clears it; `/dashboard` goes back to the login |
| Another browser, logged in before the logout | Its session is gone, and `/transactions` goes back to the login |
| A new login after the logout | Works |
| `npm run test:logout-scope`, with the idle logout after 20 s | 7 of 7, twice: the inactivity logout of one browser leaves another logged in and records no moment; "Sair" in one browser logs the other out |
| `npm run test:session-race`, 3 rounds, twice | 12 of 12 each time |

### Account: changing the name and the password

"Minha conta", in the dashboard zone, saves the name and the password. The email is read only: it is the login, and changing it needs a confirmation by email that does not exist.

| Route | Body | Answer |
|---|---|---|
| `PATCH /dashboard/api/account/profile` | `{ name }` | `200 { name }` |
| `POST /dashboard/api/account/password` | `{ currentPassword, newPassword }` | `204` |

Both follow the other writes of the bff: the `Origin` is checked before the session, the user is always the one of the session, and the body is a strict Zod object, so an `id` or an `email` in it is refused with `400`.

`ChangePassword` consumes one attempt of the login limiter by email, verifies the current password in constant time and in NFKC, refuses a new password equal to the current one (`422 PASSWORD_UNCHANGED`), applies the policy, and [ends every session](#ending-every-session) of the user, this one included. A wrong current password answers `422 INVALID_CURRENT_PASSWORD`, not `401`, because the client reads `401` as an expired session.

**The name in the session.** After saving, the screen calls `update()` of Auth.js. The zone answers in the `jwt` callback, with the `update` trigger, by reading the user again by the id of the token. What the browser sends with `update()` is ignored, so nobody can write a name, or another id, into their own token.

## Password recovery

1. `/forgot-password` always shows "Se o e-mail estiver cadastrado, enviamos um link". The answer leaves before the work starts, with `after()`, so its time does not depend on the email: measured at 88 ms for an unknown email and 76 ms for a registered one.
2. The server generates a random token of 32 bytes and stores only its SHA-256, with the user id, an expiry of 30 minutes and whether it was used. Earlier tokens of the user stop working. SHA-256 is enough here: the token has 256 random bits, so there is nothing to guess slowly, unlike a password.
3. The link uses `SHELL_URL`, never the `Host` of the request, which a client could forge to send the token to another site.
4. `/redefinir-senha` removes the token from the address bar as soon as it opens.
5. On success the token is claimed, the new hash is saved, every session of the user ends, and the login attempts of that email are cleared. With Supabase the claim is one atomic statement (`use_password_reset_token`), made before the password changes, so of two uses of one link only one wins.

An expired, used or unknown token gives one message, with a link to ask for another. A password the policy refuses does not use up the token. Both routes check the Origin and validate with Zod.

**Email.** Docker Compose runs Mailpit, with a fixed version. Its SMTP stays inside the `bytebank` network, and the inbox is at http://localhost:8025. Outside Docker, `apps/shell/.env.example` points to `127.0.0.1:1025`, not `localhost`: Node resolves `localhost` to `::1` first, nodemailer tries only that address, and a Mailpit published on `127.0.0.1` refuses it. The README shows the `docker run` of Mailpit for that case. Without `SMTP_HOST`, the shell uses `DisabledEmailSender`: the answer on the screen is the same and the server logs one line with no address. Production has no email service ([deploy.md](deploy.md#no-email-in-production)).

## Attachments

`DataCipher` is a port of the core, and `AesGcmCipher` its adapter, with `node:crypto`. `EncryptedAttachmentRepository` wraps the real repository, so the use cases do not change.

```text
aes256gcm$v1$<IV, 12 bytes>$<auth tag, 16 bytes>$<data>
```

- **The IV is random for each attachment**, and `v1` names the key, so a new key can be added later while old values still open.
- **The value is tied to its owner.** The user id goes in as authenticated data, so a value copied to the transaction of another user does not open.
- **The owner is checked first.** The inner repository filters by user, so nothing is decrypted for anyone else.
- **Any failure gives one fixed error** in the log, with the transaction id only. A value that cannot be sealed is refused, and a value in the clear does not open: there is no fallback to plain text.
- **An attachment that cannot be read does not break the list.** The transaction comes with `attachmentUnavailable: true` and no attachment, and the screens show "Anexo indisponível". It can still be edited and deleted, and editing other fields keeps the stored value.

**The file is encrypted, not its data URL.** Encrypting the data URL would apply base64 twice, and a 70 KB attachment would become about 124 KB, above the 102400 bytes that json-server accepts. With the bytes of the file it becomes about 95.6 KB, so the limit of [ADR 0009](../adr/0009-attachment-size-limit.md) did not change. A test sends exactly 70 KB to the real json-server, and the type of the file is encrypted too.

The key is `ATTACHMENT_ENCRYPTION_KEY`, 32 bytes in base64, in the zones only. **Losing or changing it makes the stored attachments unreadable**, which is why production has its own key ([deploy.md](deploy.md#secrets-of-production)).

The allowed types are `image/png`, `image/jpeg`, `image/webp` and `application/pdf`; SVG is refused because it can carry scripts ([bff.md](bff.md#security-rules)).

## Security headers and CSP

`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy` come from `next.config.ts` (`packages/utils/src/securityHeaders.ts`), on every response of the three apps, APIs included. HSTS is added only when `VERCEL_ENV` is `production` at build time, the one environment where HTTPS is certain: sent over plain HTTP it does nothing, and sent from a domain that loses HTTPS it would lock people out.

The Content-Security-Policy comes from each `proxy.ts`, with a new nonce per request:

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

- **The nonce works with multi-zones.** Each app sends its own policy. The shell adds none to the pages of the zones, because a second policy with another nonce would block their scripts.
- **The cost is that no page is static.** Next.js can only put a nonce on a page rendered per request, so the three root layouts call `connection()`. The measured cost and the reasons to accept it are in [performance.md](performance.md#no-page-is-static).
- **`img-src data:` and `frame-src data:`** exist only for attachments, which reach the screen as data URLs. A frame with a `data:` URL has an opaque origin, so it reaches nothing of the app.
- **No exception for styles.** The `style` attributes of the server render were replaced by classes, and the progress bar of investments became a `<progress>`.
- **Only in development:** `'unsafe-eval'`, `ws:` and inline styles, which fast refresh needs.
- `'strict-dynamic'` lets a script with the nonce load the lazy chunks.

## Secrets

`NEXTAUTH_SECRET` signs and encrypts the sessions, and `ATTACHMENT_ENCRYPTION_KEY` encrypts the attachments. Locally they come from a `.env` at the root (Docker) or the `.env.local` of each app, both outside git and outside the images; in production, from the variables of each Vercel project.

**Checked at start.** One rule, `packages/utils/src/secrets.ts`, refuses a missing value, the `replace-me` of the examples, or anything that is not base64 of 32 bytes or more, with the same message for each case:

```text
Missing or invalid NEXTAUTH_SECRET. Generate 32 random bytes in base64, as in step 3 of the README
```

- **Docker.** The `secrets-check` service runs the rule with plain Node 22, which runs the TypeScript of `secrets.ts` as it is, with no network and no install. The apps depend on it with `service_completed_successfully`, so `docker compose up` stops before any app starts.
- **Every start of a server**, in `instrumentation.ts` of each app: Docker, `npm run dev` and Vercel. Next only logs an error of `register()` and then answers 500 to every request, so `exitUnlessSecrets` stops the Node process instead. It runs only in the Node runtime, since Next also compiles `instrumentation.ts` for the Edge.

| Proof | Result |
|---|---|
| `NEXTAUTH_SECRET=replace-me docker compose up -d` | Exit 1: `service "secrets-check" didn't complete successfully`; its log has the message, and no app started |
| `docker compose up -d` with a valid `.env` | `Secrets: ok`, and the shell answers 200 |
| The standalone build of the shell with `NEXTAUTH_SECRET=replace-me` | The message, and exit 1 |

## Server-only entries

Server code must never reach a browser bundle: it holds the database adapters, the secret key of Supabase and the cipher of the attachments. Three barriers keep it there.

1. **`server-only`.** These files import it, and a Client Component that reaches one of them fails `next build`:
   - `packages/bff/src/index.ts`, the main entry of the bff, with the composition and the handlers;
   - `packages/auth/src/zoneHandlers.ts`, `zone.ts`, `zoneProxy.ts` and `ZoneSessionProvider.tsx`.

   Two entries are left out on purpose. `@bytebank/bff/client` runs in the browser. `@bytebank/infrastructure` is also used by Node scripts with no bundler, such as `db:reset:supabase`, where `server-only` would throw. Unit tests run in plain Node, so `vitest.config.mts` points `server-only` to its empty module, the one the server build already uses.

   Proof: with `import { createDataAdapters } from '@bytebank/bff'` in `CardNewTransaction.tsx`, a Client Component of the dashboard, the build failed with "You're importing a module that depends on "server-only"" and the trace `bff/src/index.ts [Client Component Browser]` ← `CardNewTransaction.tsx` ← `app/page.tsx`. The import was removed after the proof.

2. **The layer rules** of `eslint.layers.mjs`: `store` and `design-system` may import neither `@bytebank/infrastructure` nor `@bytebank/bff`, only `@bytebank/bff/client` ([conventions.md](../conventions.md#layers)).

3. **No direct `fetch` to the bff in the components.** The zones use `createTransactionsClient` and the shell uses `createShellClient`, both in `@bytebank/bff/client`, with the same error codes.

## Personal data in logs

- Failed requests to the database name the collection only, never the email or the user id.
- Auth.js logged the content of the token, with name and email, whenever an expired session was read. `authLogger` now logs only the name and the message of the error, in the three apps.
- The loggers of the bff handlers log the original error, never a body. A corrupted record logs its id, an internal identifier.

## How to validate

| What | How |
|---|---|
| Unit rules (policy, hasher, cipher, limiter, HMAC keys, session writes) | `npm test` ([testing.md](testing.md)) |
| Login block | Log in with an unknown email and wrong passwords: the 6th attempt shows "Muitas tentativas. Tente novamente em 15 minutos" |
| Recovery | "Esqueci a senha" with `julia@bytebank.com`, then the email in Mailpit, http://localhost:8025 |
| CSP | DevTools: no CSP violation in the console; the response has `Content-Security-Policy` with a nonce |
| HSTS in production | `curl -sI https://bytebank-shell.vercel.app/ \| grep -i strict-transport-security` |
| Secrets refused | `NEXTAUTH_SECRET=replace-me docker compose up -d` stops at `secrets-check` |
| Session race | `npm run test:session-race` against a running app ([testing.md](testing.md#browser-regression-the-session-race)) |
| What each logout ends | `npm run test:logout-scope` with short idle times ([testing.md](testing.md#browser-regression-what-each-logout-ends)). By hand: log in on two browsers; leave one idle and the other stays in; then "Sair" on one and the other goes back to the login at its next page. The moment is in `db.json` (`sessionsValidAfter`) or in `users.sessions_valid_after` |
| HMAC limiter against Postgres | The Supabase contract suite ([deploy.md](deploy.md#contract-tests)) |
| Server-only | Import `@bytebank/bff` in a Client Component: the build fails |

## Known limits

- **"Sair" ends the sessions of every device.** Someone who only wanted to leave one computer leaves the phone too: the price of a logout that no copy of the cookie can undo.
- **The inactivity logout only clears the cookie of its browser.** A copy of that cookie, taken before, stays valid until it expires (30 minutes at most), as before the revocation. The fetches of the router no longer write it back, so the late answers of the session race do not apply.
- **If "Sair" cannot reach the server**, the browser still clears its own cookie: the person leaves this browser, and the other sessions stay until they expire.
- **One read of the user per check of a session**, with no cache ([Ending every session](#ending-every-session)). If the database is down, every session ends (it fails closed).
- **The clocks of the servers.** The moment of the logout and the start of a session come from the clocks of different functions. A login within a few milliseconds of a logout, on servers whose clocks differ by more than that, could be refused once.
- **A rename made in another tab** is not rewritten into the token of a tab that started a read of the session before it; it shows after the next page load. The logout no longer has this problem, since the server refuses the old session.
- **The token travels in a link**, so whoever reads the email can use it within 30 minutes. It stays in the HTML of the first response and in the access logs of any proxy in front of the shell.
- **A failed email looks like a sent one to the person**; only the server log shows it. No email warns about a changed password.
- **An 8-character password not on the list is accepted**, such as a name and a year that the list lacks. The strength indicator shows it as weak or fair, and only that.
- **The registration does not fully hide an email.** Someone can register a known email with a password of their choice and then try to log in with it: if that fails, the email already existed. Only a confirmation email closes this. A registered email also skips the final write, which is a few milliseconds faster.
- **A blocked login says so, and answers faster** (about 10 ms instead of about 250 ms). It shows that an email reached the limit, not that it exists.
- **Someone can lock an account on purpose** with 5 wrong passwords, for 15 minutes: the known cost of a limit by email.
- **The limit by IP trusts `x-forwarded-for`.** Vercel sets it; in Docker there is no proxy in front of the shell, so a client can send any value. The limit by email does not depend on it.
- **Guarantees that only Supabase gives.** With json-server, two simultaneous registrations of one email or two uses of one reset link can both pass, and each app counts its own attempts in memory. These cases are skipped for json-server in the contract suite ([deploy.md](deploy.md#contract-tests)).
- **Key rotation is prepared, not built.** The format has the version; a second key needs a map of keys and a job to encrypt the stored values again.
- **Attachments are decrypted on every read**, including the balance, because the repository does not know which fields the use case needs. A separate route for attachments would solve it.
- **The old secret and the plain-text passwords of the first seed remain in the git history.** Rewriting it is a separate decision; neither is used anywhere.
- **Local secrets are plain text on the disk**, in `.env` and `.env.local`. Production uses the variables of the platform.

## Next phase

Found in the review and left out on purpose:

- **CI.** The Storybook tests and `test:session-race` do not run in GitHub Actions. Storybook needs `npx playwright install chromium` in a job of its own; the session race needs a running app.
- **Cleaning the database.** Expired reset tokens and old rows of `rate_limits` are never deleted. A scheduled job (pg_cron) or a delete when a token is created would keep the tables small.
- **Adapters of `/sobre`.** The page builds the adapters on every request (`createDataAdapters()`), and so does the refresh of the name in `@bytebank/auth/zone`. It costs little, since Supabase is HTTP with no pool of connections, but they could be cached like the handlers.
- **Lazy modals in Storybook** ([testing.md](testing.md#storybook)): they do not load there, so `TransactionActions` is tested in the browser.
