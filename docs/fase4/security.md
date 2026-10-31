# Phase 4: security (Block 3)

This document follows Block 3. Each step adds what changed, why, and what is still open.

## Step 3.1: passwords and authentication

### Before and after

| | Before | After |
|---|---|---|
| Stored password | Plain text in `db.seed.json` and `db.json` | Only a scrypt hash, in `passwordHash` |
| `authorize` | 3 copies: shell, dashboard, transactions | 1, in the shell, calling `AuthenticateUser` |
| Password check | `user.password !== password` in each copy | `ScryptPasswordHasher.verify`, with `timingSafeEqual` |
| Unknown email | No password comparison, so it answered faster | Verifies a decoy hash, so it takes the same time |
| Registration | Created nothing: it checked the terms and redirected | `POST /api/register`, validated with Zod and an Origin check, calling `RegisterUser` |
| json-server variable in the shell | `NEXTAUTH_API_URL` and `JSON_SERVER_URL` | `JSON_SERVER_URL` only |
| Session | id, name, email | The same: no hash, no password |

The registration screen never reached json-server, and it had no way to. Closing port 3001 in step 2.5b changed nothing for it, because it never sent a request at all.

### Layers

```text
ModalLogin        -> Auth.js -> authorize (shell) -> AuthenticateUser ---+
ModalCadastro     -> POST /api/register -> createRegisterHandler -> RegisterUser
                                                                         |
                          UserRepository: HttpUserRepository (json-server)
                          PasswordHasher: ScryptPasswordHasher (node:crypto)
```

- `@bytebank/core` has the `User` entity, the `UserRepository` and `PasswordHasher` ports, and the two use cases. It does not import `node:crypto`.
- Use cases return `UserDTO`, which has no hash. The hash only exists inside `User`, for the application and the adapter that stores it.
- The zones have no provider: they read the JWT of the shell with the same `NEXTAUTH_SECRET`, and the only login is in the shell.

### Why scrypt

| Option | Decision |
|---|---|
| SHA-256 and similar | No. They are fast by design, which is what an attacker with a stolen database wants |
| bcrypt, Argon2id | Good, but both need a new dependency. Argon2id is the first choice of OWASP when one is available |
| PBKDF2 | Available in `node:crypto`, but it needs little memory, so GPUs attack it cheaply |
| scrypt | In `node:crypto`, with no dependency, and memory-hard: each guess costs memory as well as time |

### Parameters and format

`N = 2^17`, `r = 8`, `p = 1`, the OWASP minimum for scrypt. Each hash needs about 128 MiB and takes about 250 ms in the shell container, on the machine used for this step. Salt: 16 random bytes per password. Key: 32 bytes.

```text
scrypt$N=131072,r=8,p=1$<salt in base64url>$<hash in base64url>
```

The hash describes itself, so the parameters can grow later: old hashes keep working, because `verify` reads the parameters stored with each one. `verify` answers `false` for anything it cannot read, and refuses parameters that would need more than 256 MiB, so a damaged record cannot ask the server for gigabytes.

`packages/infrastructure/scripts/hash-password.mjs` generates a hash for the seed. It reads the password from stdin, to keep it out of the shell history:

```bash
node packages/infrastructure/scripts/hash-password.mjs < file-with-the-password
```

The script repeats the parameters of `ScryptPasswordHasher`, because it has no dependency. A test proves that the application accepts what the script prints.

### Not revealing which emails exist

- **Login:** a wrong password and an unknown email give the same `INVALID_CREDENTIALS`, the same response and the same message. When the user does not exist, `AuthenticateUser` verifies a decoy hash made with the same parameters.
- **Measured at the endpoint**, in the real Docker Compose setup, with 80 failed logins in random order: median of 249 ms for two existing emails and of 249 ms and 250 ms for two unknown ones, with one identical response.
- **Registration:** `/api/register` answers `202 {"status":"ACCEPTED"}` for a new email and for a registered one, and the screen shows the same text. So the registration does not log the person in: they log in afterwards. An automatic login would tell the two cases apart on the screen.

### Registration rules

- The name has from 1 to 100 characters, and the password had from 8 to 128 until step 3.4, which moved this rule to the domain. `authorize` also ignores passwords above 128 characters, so a huge value never reaches the hash.
- Emails are trimmed and stored in lower case, in the domain, so the same email in another case is the same user.
- The Origin check is the one of the BFF, and it runs before the body is read. The shell needs `ALLOWED_ORIGINS` for it.

### Moving an existing database

`db.json` is only created when it is missing, so a copy from before this step still has plain-text passwords, and its users cannot log in: the repository reports them as `CORRUPTED_RECORD`. Run:

```bash
npm run db:reset
docker compose restart json-server
```

### Still open after step 3.1

Steps 3.2 and later answer these. What is left is at the end of this document.

- No rate limiting: answered in step 3.2.
- The email in the log: answered in step 3.2.

## Step 3.2: session, inactivity and attempt limits

### Values

| Value | Default | Why |
|---|---|---|
| Session (`maxAge`) | 30 minutes | Limits what a stolen cookie is worth. A bank session should not last the 30 days of the Auth.js default |
| Renewal (`updateAge`) | 5 minutes | How often the browser renews the session while in use |
| Inactivity | 10 minutes | Protects a computer left open. Shorter than the session, so that the person is warned and leaves on purpose |
| Warning | 1 minute before | Enough time to read and answer |
| Login by email | 5 failures in 15 minutes | Stops password guessing against one account, without punishing a typing mistake |
| Login by IP | 20 failures in 15 minutes | Stops one origin from trying many accounts. Higher than the email limit, because many people can share one address |
| Registration by IP | 10 in 1 hour | Each registration costs one scrypt hash and creates a record |

The session and inactivity values are in `packages/utils/src/sessionPolicy.ts`, and the limits in `packages/bff/src/composition/createJsonServerAuthUseCases.ts`.

### Expiring on the server

All three apps read the same policy, because a zone that renews the session writes the cookie with its own `maxAge`.

- **`updateAge` does nothing in Auth.js with JWT.** It only applies to database sessions: with JWT, every read of the session already issues a new token. The API routes read the session but cannot set cookies, so someone working on one screen would never renew it. `IdleSessionGuard` closes this: while there is activity it reads the session every `updateAge`.
- **Expired session:** the proxies lead pages to the shell, and the zone APIs answer 401. The shell has no route that needs a session.
- **Tolerance:** Auth.js accepts a token up to 15 seconds after it expires (`clockTolerance`), for clocks that differ. A session of 30 minutes really ends at 30 minutes and 15 seconds.

### Inactivity

`IdleSessionGuard` (`packages/design-system/src/session/`) is used by the three apps, inside their `SessionProvider`. The timing logic is in `idleMonitor.ts`, with no React and no browser API, so it is tested with simulated time.

- Mouse, keyboard, touch, wheel and scroll count as activity.
- During the warning only "Continuar conectado" counts, or a moved mouse would hide the warning before anyone read it.
- Times are calculated from timestamps, not by counting ticks: background tabs have slow timers, and a computer that slept must log out at once.
- Tabs share the last activity through `localStorage` and its `storage` event. All zones share the origin of the shell, so this reaches every tab of the app. It holds only a timestamp.
- The dialog has `role="alertdialog"`, with the focus on the button. The visible countdown is hidden from screen readers, and a live region speaks only at 30 and at 10 seconds.
- This logout runs in the browser. With every tab closed, what ends the session is the `maxAge` of the server.

### Shortening the times for a demonstration

The times are read when the app runs, so this needs no rebuild. In PowerShell:

```powershell
$env:IDLE_TIMEOUT_SECONDS = 30
$env:IDLE_WARNING_SECONDS = 15
docker compose up -d --no-deps --force-recreate shell dashboard transactions
```

To go back to the defaults:

```powershell
Remove-Item Env:IDLE_TIMEOUT_SECONDS, Env:IDLE_WARNING_SECONDS
docker compose up -d --no-deps --force-recreate shell dashboard transactions
```

`SESSION_MAX_AGE_SECONDS` shortens the session in the same way. Outside Docker, put the same variables in `apps/shell/.env.local` (for `SESSION_MAX_AGE_SECONDS`, also in the `.env.local` of each zone).

These variables can only shorten. A value above the default, or one that is not a positive integer, is ignored, so a mistake cannot make a session last longer.

The browser reads the times from `/api/session-policy`, on the shell. It is public and has no secret. A `NEXT_PUBLIC_` variable would be fixed at build time, and each change would need a rebuild.

### Attempt limits

`RateLimiter` is a port in `@bytebank/core`, because the rule belongs to the use cases: it decides whether the password is even checked, and it must run before the hash. The adapter is `InMemoryRateLimiter`, in `@bytebank/infrastructure`.

- The window slides: an attempt stops counting 15 minutes after it happened. A refused attempt does not count, so it does not extend the block.
- The attempt is counted before the hash and given back on success. Counting afterwards would let parallel attempts all pass the check.
- A success gives back only its own attempt. It does not clear earlier failures.
- A failure of the backend also gives the attempt back, because nobody got the password wrong.
- Unknown emails count exactly like known ones.
- A wrong password and an unknown email always give the same message. A blocked login gives another one: "Muitas tentativas. Tente novamente em X minutos".
- **The block does not reveal which emails exist**, because it counts failures per email as typed, whether it exists or not, and it is decided before the user is looked up. An unknown email gets the same block and the same countdown as a real one.
- The wait comes from the server, in the `code` that Auth.js hands to the browser. It is the time until the oldest attempt leaves the window, and refused attempts do not extend it.
- The counter on the screen changes every minute and enables the button when the wait ends. A screen reader hears only the first message: the live region keeps that text, and the visible counter is hidden from it. The block applies to the email that was typed, so changing the email enables the button.

**In memory, the limit is per instance.** Each process counts on its own, and a restart forgets everything. With several instances, as on Vercel, the real limit is the configured one times the number of instances, and serverless instances are short-lived. Production needs a shared store, such as Redis, with an atomic counter. Only the adapter changes.

To clear the limits while testing: `docker compose restart shell`.

### Personal data in logs

- Failed requests to json-server no longer have the email or the user id in the error: `InfrastructureError` names the collection only.
- **Auth.js logged the content of the token, with name and email, whenever an expired session was read.** It was found by running the expiry test and reading the container logs, not by searching the code. `authLogger` now logs only the name and the message of the error, in the three apps.
- All logs of the project were reviewed: the two `logger` of the BFF handlers and `authLogger`. A stored record that is corrupted logs its id, which is an internal identifier.

## Step 3.3: images, headers, attachments and secrets

### Sensitive data and its protection

| Sensitive data | Protection | Where |
|---|---|---|
| Password | scrypt hash, with one salt per password | `ScryptPasswordHasher` |
| Attachment | AES-256-GCM, tied to the owner, with the key in a server variable | `AesGcmCipher`, `EncryptedAttachmentRepository` |
| Session | JWT signed by the server, in a cookie, expiring in 30 minutes | Auth.js, `sessionPolicy.ts` |
| Secrets | `.env` outside git, and required by Docker Compose | `.env.example`, `docker-compose.yml` |
| The JSON database | No published port: only the apps reach it | `docker-compose.yml` |

### json-server with no download

The image installs `json-server@1.0.0-beta.15` at build time (`apps/shell/Dockerfile.jsonserver`). Before, `npx` asked the registry on every start, so a machine with no way out could not even restart the database. The container now starts with `--network none`.

The seed is also in the image, outside `/app`, because Railway has no mounted folder.

### Security headers

`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` and `Permissions-Policy` come from `next.config.ts`, on every response of the three apps, APIs included. HSTS is added only when `VERCEL_ENV` is `production` at build time, the one environment where HTTPS is certain. Sent over plain HTTP, it would do nothing, and sent from a domain that loses HTTPS it would lock people out.

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

- **The nonce works with multi-zones.** Each app sends its own policy. The shell does not add one to the pages of the zones, because a second policy with another nonce would block their scripts.
- **The cost is that no page is static.** Next.js can only put a nonce on a page rendered per request, so the three root layouts call `connection()`, and the root layouts of the zones became Server Components.
- **`img-src data:` and `frame-src data:`** exist only for attachments, which reach the screen as data URLs: images in `<img>` and PDFs in `<iframe>`. A frame with a `data:` URL has an opaque origin, so it reaches nothing of the app.
- **No exception for styles.** `style-src-attr` would be needed for `style` attributes in the server render, so those attributes were replaced by classes, and the progress bar of investments became a `<progress>`.
- **Only in development:** `'unsafe-eval'`, `ws:` and inline styles, which fast refresh needs.

### Attachment encryption

`DataCipher` is a port in `@bytebank/core`, and `AesGcmCipher` is its adapter, with `node:crypto`. `EncryptedAttachmentRepository` wraps the real repository, so the use cases are unchanged.

```text
aes256gcm$v1$<IV, 12 bytes>$<auth tag, 16 bytes>$<data>
```

- **The IV is random for each attachment**, and `v1` names the key, so that a new key can be added later while old values still open. Rotation itself is not built yet.
- **The value is tied to its owner.** The user id goes in as authenticated data, so a value copied to the transaction of another user does not open.
- **The owner is checked first.** The inner repository filters by user, so nothing is decrypted for anyone else.
- **Any failure gives one fixed error.** A changed value, the wrong key or an unknown version answer `502 UPSTREAM_ERROR`, and the log has only the transaction id.
- **A value that cannot be sealed is refused**, and a value in the clear does not open: there is no fallback to plain text.

**The file is encrypted, not its data URL.** Encrypting the data URL would apply base64 twice, and an attachment of 70 KB would become about 124 KB, above the 102400 bytes that json-server accepts. With the bytes of the file, it becomes about 95.6 KB, and the limit did not change. A test sends exactly 70 KB to the real json-server, and the type of the file is encrypted too.

The key is `ATTACHMENT_ENCRYPTION_KEY`, 32 bytes in base64, required in the zones on the first request. **Losing or changing it makes the stored attachments unreadable.** A `db.json` from before this step with attachments needs `npm run db:reset`.

### Secrets

`NEXTAUTH_SECRET` and `ATTACHMENT_ENCRYPTION_KEY` come from a `.env` at the root of the repository, which is outside git and outside the images. Docker Compose refuses to run without them, and says which one is missing. `.env.example` has the command to generate each value.

The previous `NEXTAUTH_SECRET` was in `docker-compose.yml` and in `README.md`, so it stays in the git history and must not be used again.

## Step 3.4: password policy and recovery

### An attachment that cannot be read

Before this step, one damaged attachment made the list of its owner answer 502, and the transaction could not be deleted. Now the transaction stays in the list with `attachmentUnavailable: true` and no attachment, and the screens show "Anexo indisponível". It can be edited and deleted. Editing other fields keeps the stored value, which may open again if the problem was the key. The log has only the id of the transaction.

### Password policy

It follows NIST SP 800-63B rev. 4 for a password used alone. It applies to new passwords only, in `RegisterUser` and `ResetPassword`, through `hashNewPassword`. **The rule is in the domain** (`passwordPolicy.ts`). The BFF only limits the size of the request, and the screens mirror the rule.

| Rule | Value | Why |
|---|---|---|
| Length | 15 to 128 characters | Counted in characters, so an emoji counts as one |
| Composition | None | NIST advises against it: it leads to predictable patterns, such as `Senha123!` |
| Normalization | NFKC before the hash | Two spellings of one character must give one password |
| Common passwords | The 10,000 most common, without case, spaces or accents | Checked before the length, so `password` says what is wrong with it |
| Repetition | One piece repeated, such as `passwordpassword` | NIST also asks to refuse repetitive values, and these pass the length |
| Context | `bytebank`, and parts of the name and of the email with 3 or more characters | The first guesses of anyone who knows the person |

The login also normalizes with NFKC, or a password with such a character could never log in again. For the passwords that already exist, which are ASCII, nothing changes. The login does not apply the policy, so `bytebank123`, the password of the demonstration, still works.

**The list does little by itself.** Only 1 of its 10,000 entries has 15 characters or more, so the minimum length already refuses the others. It stays because it gives the right message, and it catches a listed password written with spaces. Most of the protection comes from the length.

The list is `10k-most-common.txt` from [SecLists](https://github.com/danielmiessler/SecLists), by Daniel Miessler and contributors, MIT license. It is in `packages/infrastructure/src/password/common-passwords.json`, in lower case, and only server code reads it.

**The screens do not have the list.** The strength indicator uses the length, the repetition and the context words, and it shows a password as common only after the server refuses it.

### Recovery

1. `/forgot-password` always shows "Se o e-mail estiver cadastrado, enviamos um link". The answer leaves before the work starts, with `after()`, so its time does not depend on the email either: measured at 88 ms for an unknown email and 76 ms for a registered one.
2. The server generates a random token of 32 bytes and stores only its SHA-256, with the user id, the expiry of 30 minutes and whether it was used, in the `passwordResetTokens` collection. Earlier tokens of the user stop working.
3. The link in the email uses `NEXTAUTH_URL`, never the `Host` of the request, which a client could forge to send the token to another site.
4. `/redefinir-senha` removes the token from the address bar as soon as it opens.
5. On success, the new hash is saved, the token is marked as used and the login attempts of that email are cleared.

SHA-256 is enough here, because a token has 256 random bits, so there is nothing to guess slowly, unlike a password.

An expired, used or unknown token gives one message, with a link to ask for another. A password the policy refuses does not use up the token, so the person can try again with the same link.

Limits: 5 requests per email and 20 per IP in 15 minutes, counted apart from the login. Over the limit, the answer stays the same and no email goes out.

Both routes check the Origin and validate with Zod, as the registration does.

### Mailpit

Docker Compose has Mailpit, with a fixed version. Its SMTP stays inside the `bytebank` network, and the inbox is at http://localhost:8025, on this machine only.

Outside Docker, `apps/shell/.env.local` points to `localhost:1025`, but that port is not published. Email there needs a Mailpit started by hand. The answer on the screen is the same, and the failure goes to the server log.

### Still open

- **A session already open survives the password change.** The JWT is valid until it expires, 30 minutes at most, so changing the password does not throw out someone who stole the session. It needs a version of the session stored on the server.
- **The token travels in a link**, so whoever reads the email can use it within 30 minutes. It stays in the HTML of the first response, and in the access logs of any proxy in front of the shell.
- **Two simultaneous uses of one link can both pass.** The check and the mark are separate requests, and json-server has no transaction.
- **A failed email looks like a sent one to the person.** Only the server log shows it.
- **The old secret and the old plain-text passwords of the seed remain in the git history.** Rewriting it is a separate decision. The secret was replaced in `.env`, and it must not be used anywhere.
- **Key rotation is prepared, not built.** The format has the version, and a second key needs a map of keys and a job to encrypt the stored values again.
- **Attachments are decrypted on every read**, including the balance, because the repository does not know which fields the use case needs. It costs little at this size, and a separate route for attachments would solve it.
- **`.env` is plain text on the disk.** Production needs the variables of the platform or a secret manager.
- **A blocked login says so, and answers faster**, in about 10 ms instead of about 250 ms. Both show that an email typed by someone reached the limit, not that it exists, because unknown emails are blocked too.
- **Someone can lock an account on purpose**, with 5 wrong passwords, for 15 minutes. It is the known cost of a limit by email.
- **The limit by IP trusts `x-forwarded-for`.** On Vercel the platform sets it. In Docker there is no proxy in front of the shell, so a client can send any value and escape the limit by IP. The limit by email does not depend on this.
- **The in-memory limit is per instance**, as described in step 3.2.
- **The registration does not fully hide an email.** Someone can register a known email with a password of their choice and then try to log in with it: if that fails, the email already existed. Only a confirmation email closes this. A registered email also skips the final write to json-server, which is a few milliseconds faster.
- **Two simultaneous registrations of the same email can both pass.** The lookup and the write are separate requests, and json-server has no unique index. A real database needs a unique constraint.
- **The JWT cannot be revoked.** Logging out deletes the cookie, but a copy of the token still works until it expires, 30 minutes at most.
