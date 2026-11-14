# Production database and deploy

Production runs on Vercel, one project per app, with a Postgres database on Supabase. Locally, json-server stays the default database, in Docker. The decision and its alternatives (Firestore, a Postgres of our own, Supabase Auth) are in [ADR 0010](../adr/0010-supabase-as-production-database.md).

| Service | Platform | URL |
|---|---|---|
| shell | Vercel | https://bytebank-shell.vercel.app |
| dashboard | Vercel | https://bytebank-dashboard.vercel.app |
| transactions | Vercel | https://bytebank-transactions-virid.vercel.app |
| database | Supabase (Postgres, us-east-1) | server only, with the secret key |

## How it works

```text
Browser ──▶ shell / dashboard / transactions (Next.js, server)
                 │  login, sessions and rate limits are ours
                 ▼
          @bytebank/bff  ──  createDataAdapters()  ── DATA_BACKEND
                 │                         │
        json-server (default)      Supabase (Postgres)
                                   secret key, server only
```

Supabase is only the database: no Supabase Auth, Storage or Realtime. The browser never talks to Supabase. Every query goes from the server, with the secret key, through the adapters of `@bytebank/infrastructure` (`packages/infrastructure/src/supabase/`). `DATA_BACKEND` is read in one place, `createDataAdapters` in `packages/bff/src/composition/dataAdapters.ts`; the use cases, the handlers and the screens are the same for both backends.

### Tables

The migration is `supabase/migrations/0001_init.sql`.

| Table | What it holds | Rules |
|---|---|---|
| `users` | `id`, `name`, `email`, `password_hash` | Unique email in any case (`lower(email)`). Name from 1 to 100 characters, as in the domain |
| `transactions` | `id`, `user_id`, `type`, `amount_in_cents`, `date`, `attachment` | `user_id` references `users` with `on delete cascade`. `type` is one of the 7 codes. Amount is a positive integer. Index on `(user_id, date desc)` |
| `password_reset_tokens` | `id`, `user_id`, `token_hash`, `expires_at`, `used_at` | Only the hash of the token |
| `rate_limits` | `key`, `window_start`, `hits` | One counter per key and window. The key is an HMAC-SHA-256 made by the server with a key derived from `NEXTAUTH_SECRET`, so no email or IP is stored, and none can be found back without that key ([security.md](security.md#keys-of-the-rate-limits)) |

The ids are text, because the domain makes them (`CryptoIdGenerator`) and the seed uses `"1"` and `"2"`. The attachment column holds the value encrypted by the server (`aes256gcm$v1$...`), never the file.

### Atomic functions

- **`use_password_reset_token(id)`** claims a token in one `update ... where used_at is null`. Of two calls at the same time, only one gets `true`. `ResetPassword` claims the token before it changes the password, so the call that loses changes nothing.
- **`consume_rate_limit(key, max, window)`** locks the row of the key, counts the attempt and answers whether it may go on and the time left. Parallel attempts are counted one by one.
- **`release_rate_limit(key)`** gives the last attempt back.

With Supabase the rate limits are shared by every app and instance: the login of the shell and the password change of the dashboard count in the same namespace (`login-email`), so 5 guesses spread over both still block. With json-server each process counts in memory.

### Why RLS with no policy

Supabase exposes every table of `public` through a REST API that anyone with the publishable key can call. Our access control is not in the database: it is the session of Auth.js, checked by the bff.

- **RLS on with no policy** denies every row to the roles that RLS applies to.
- **The revokes** remove the default grants of `anon` and `authenticated`, so the publishable key gets `401 permission denied` on every table and function.
- **The secret key** uses `service_role`, which bypasses RLS. It lives on the server only, never in a `NEXT_PUBLIC_` variable.

Proof: with the publishable key against the real project, the four tables and the function answer `401` with code `42501`.

### Vercel

- **Rewrites from variables.** `next.config.ts` of the shell builds the rewrites from `DASHBOARD_URL` and `TRANSACTIONS_URL` (`packages/utils/src/zoneRewrites.ts`), the same code in development, Docker and Vercel. On Vercel a missing host stops the build instead of falling back to a fixed one. They are read at build time, so a change of URL needs a new deploy. `vercel.json` has no rewrites or hosts.
- **One region.** The three `vercel.json` set `regions: ["iad1"]`, the region of the database (us-east-1), so every query stays in Washington, D.C.
- **The link of the reset email** uses `SHELL_URL`, the public address of the shell, never the Host of the request.
- **HSTS** goes out when `VERCEL_ENV` is `production`, on production deployments only.
- **`/sobre`** reads its numbers through `createDataAdapters().statistics`, so it works with both backends. It only counts: no row and no user leaves the database.

### No email in production

There is no email service in production. Password recovery is the only flow that sends email, and it is shown locally, with Mailpit. With no `SMTP_HOST`, the shell uses `DisabledEmailSender`:

- "Esqueci a senha" answers the same generic message, for a known email and an unknown one, with no error.
- The reset runs as with email: the token is made and stored, so the time and the database behave alike.
- The server log gets one line, with no address, no link and no content: `Email sending is disabled (SMTP_HOST is not set): a message was not sent`.

Locally, Docker sets `SMTP_HOST=mailpit`.

## Configuration

### Variables of the database

| Variable | Where | Note |
|---|---|---|
| `DATA_BACKEND` | shell, dashboard, transactions | `json-server` (default) or `supabase`. Any other value stops the app with a clear message |
| `SUPABASE_URL` | the same | Required with `supabase` |
| `SUPABASE_SECRET_KEY` | the same | Required with `supabase`. Server only |
| `SUPABASE_PUBLISHABLE_KEY` | `.env` only | Not used by the apps. Only for the proof that it reads nothing |
| `JSON_SERVER_URL` | the same | Required with `json-server` |

A missing variable says which one and why, for example `Missing required environment variable: SUPABASE_URL (DATA_BACKEND is supabase)`. The build never needs them: the adapters are made on the first request.

### Variables per Vercel project

Set for the **Production** environment. "Same" means the same value in every project that uses it.

**shell**

| Variable | Value comes from | Secret |
|---|---|---|
| `DATA_BACKEND` | `supabase` | no |
| `SUPABASE_URL` | Supabase → Project Settings → Data API → API URL, without the trailing `/rest/v1/` (`https://<project>.supabase.co`) | no |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → the secret key made for production. Same in the 3 projects | **yes** |
| `NEXTAUTH_SECRET` | New, generated (below). Same in the 3 projects | **yes** |
| `NEXTAUTH_URL` | `https://bytebank-shell.vercel.app` | no |
| `SHELL_URL` | `https://bytebank-shell.vercel.app` | no |
| `ALLOWED_ORIGINS` | `https://bytebank-shell.vercel.app` | no |
| `DASHBOARD_URL` | `https://bytebank-dashboard.vercel.app` (read at build time) | no |
| `TRANSACTIONS_URL` | `https://bytebank-transactions-virid.vercel.app` (read at build time) | no |

**dashboard**

| Variable | Value comes from | Secret |
|---|---|---|
| `DATA_BACKEND` | `supabase` | no |
| `SUPABASE_URL` | the same as the shell | no |
| `SUPABASE_SECRET_KEY` | the same as the shell | **yes** |
| `NEXTAUTH_SECRET` | the same as the shell | **yes** |
| `ATTACHMENT_ENCRYPTION_KEY` | New, generated (below). Same in dashboard and transactions | **yes** |
| `NEXTAUTH_URL` | `https://bytebank-dashboard.vercel.app` (its own address, as in Docker) | no |
| `SHELL_URL` | `https://bytebank-shell.vercel.app` (where the proxy of the zone sends a visitor with no session) | no |
| `ALLOWED_ORIGINS` | `https://bytebank-shell.vercel.app` (the browser calls the zone through the shell) | no |

**transactions:** the same as the dashboard, except `NEXTAUTH_URL`, which is `https://bytebank-transactions-virid.vercel.app`.

No SMTP variable in any project. `SESSION_MAX_AGE_SECONDS`, `IDLE_TIMEOUT_SECONDS` and `IDLE_WARNING_SECONDS` are only for demonstrations and stay unset.

Earlier deploys used a json-server on Railway. These variables may still be in the panels and must go:

| Variable | Why |
|---|---|
| `NEXT_PUBLIC_API_URL` | The browser called json-server directly. Now it only calls the bff, and a `NEXT_PUBLIC_` variable is public |
| `NEXTAUTH_API_URL` | Read by an old login. Nothing reads it now |
| `JSON_SERVER_URL` | Only with `DATA_BACKEND=json-server`, which production does not use |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM` | Any of them would turn the email on, with no server to send it |
| `DOCKER` | Only for the Docker image |

### Secrets of production

The secrets of production are new, different from the local ones. `NEXTAUTH_SECRET` and `ATTACHMENT_ENCRYPTION_KEY` are 32 random bytes in base64, each generated on its own; the apps refuse anything else at start ([security.md](security.md#secrets)):

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

`SUPABASE_SECRET_KEY`: in Supabase → Project Settings → API Keys, create a new secret key with a name such as `vercel-production`. It can be revoked alone, without touching the key of local development.

A new `ATTACHMENT_ENCRYPTION_KEY` cannot read an attachment encrypted with the local key: a local run against Supabase shows "Anexo indisponível" for attachments made in production, and the other way around.

### Build settings per project

| Setting | shell | dashboard | transactions |
|---|---|---|---|
| Framework Preset | Next.js | Next.js | Next.js |
| Root Directory | `apps/shell` | `apps/dashboard` | `apps/transactions` |
| Include files outside the Root Directory | on | on | on |
| Install Command | from `vercel.json`: `cd ../.. && npm ci` | the same | the same |
| Build Command | from `vercel.json`: `cd ../.. && npx turbo build --filter=@bytebank/shell` | `... --filter=@bytebank/dashboard` | `... --filter=@bytebank/transactions` |
| Output Directory | default | default | default |
| Node.js Version | 22.x | 22.x | 22.x |
| Function Region | `iad1`, from `vercel.json` | the same | the same |

The commands live in `vercel.json`, so the overrides of the panel stay off.

### Order of the steps

1. **Supabase.** Run `supabase/migrations/0001_init.sql` once in the SQL Editor. Create the secret key of production. Leave only the demonstration in the database, from a local machine with the key of `.env`: `npm run db:reset:supabase`.
2. **Generate** `NEXTAUTH_SECRET` and `ATTACHMENT_ENCRYPTION_KEY`, and keep them in a password manager.
3. **dashboard and transactions:** build settings as in the table, delete the old variables, add the new ones, redeploy with the build cache off.
4. **shell**, last: it proxies the zones, and its build reads their URLs.
5. **Test** the production deployment, as below.

## Running locally against Supabase

1. Run the migration once in the SQL Editor of the project.
2. Put `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the `.env` of the root.
3. Seed the demonstration: `npm run db:seed:supabase`. It can run twice: it adds what is missing and changes nothing else.
4. Start with the variable, in PowerShell:

   ```powershell
   $env:DATA_BACKEND='supabase'; docker compose up -d --build; Remove-Item Env:DATA_BACKEND
   ```

5. Back to the default: `docker compose up -d`, then `npm run db:reset` and `docker compose restart json-server`.

| Script | What it does |
|---|---|
| `npm run db:seed:supabase` | Creates the demonstration users and transactions that are missing |
| `npm run db:clean:supabase` | Deletes the demonstration users and all that belongs to them |
| `npm run db:reset:supabase` | Empties every table, then seeds: only the demonstration is left |

### HTTPS inspected by an antivirus

On a machine whose antivirus inspects HTTPS (Avast does), the containers refuse the certificate of Supabase with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. The antivirus signs again with its own root, which Windows trusts and Linux does not. Production has no such proxy.

To use Docker anyway, export that root from the Windows certificate store to a PEM file, and pass it to the three app containers in an override that stays out of git:

```yaml
services:
  shell:
    environment:
      - NODE_EXTRA_CA_CERTS=/etc/local-ca.pem
    volumes:
      - "C:/path/to/local-ca.pem:/etc/local-ca.pem:ro"
  # the same for dashboard and transactions
```

Start with `docker compose -f docker-compose.yml -f <override>.yml up -d`.

## How to validate

### Contract tests

`packages/infrastructure/src/contracts` has one contract suite per port: users, transactions, reset tokens and rate limits. The same cases run against both backends:

- **json-server**, started for the test, with the memory limiter, in `npm test` and in the CI.
- **Supabase** with the Postgres limiter (and its HMAC keys), only on demand:

  ```powershell
  $env:SUPABASE_CONTRACT_TESTS='1'; npx vitest run supabase.contract; Remove-Item Env:SUPABASE_CONTRACT_TESTS
  ```

  Everything the run creates has a prefix of its own and is deleted at the end.

Three cases are skipped for json-server because it cannot hold them: a second user with the same email, two registrations at the same time, and two claims of one reset link at the same time. For Supabase every case runs. The counts are in [testing.md](testing.md).

### Deploy test

On https://bytebank-shell.vercel.app, in a private window:

1. Log in with the demonstration user, open the dashboard and the extract (the zones through the shell), and check the balance and the charts.
2. Create, edit and delete a transaction. Attach an image and open it.
3. Change the name in "Minha conta" and check the header.
4. "Esqueci a senha": the generic message appears. In Vercel → shell → Logs, the line about the disabled email shows up, with no address.
5. Open `/sobre`: the numbers come from Supabase.
6. Check the headers: `curl -sI https://bytebank-shell.vercel.app/ | grep -i strict-transport-security` shows HSTS.
7. Check the region: in Vercel → Logs, the functions run in `iad1`.
8. Log out, and open `/dashboard`: the login comes back.
9. Run the regression test of the session race against production ([testing.md](testing.md#browser-regression-the-session-race)). It changes the name of the demonstration user and puts it back; finish with `npm run db:reset:supabase`.

A Preview deployment uses the variables of the Preview environment, which this checklist does not set: test on Production.

## Known limits

- **Migrations by hand.** The SQL is versioned, but it runs in the SQL Editor. A second migration needs the Supabase CLI or a runner.
- **Expired tokens and old rate-limit rows are never deleted** ([security.md](security.md#next-phase)).
- **Two backends to keep.** The contract suites keep them aligned; the guarantees that only Postgres gives are listed in [security.md](security.md#known-limits).
- **Other sessions after a password change** stay valid until the JWT expires ([security.md](security.md#known-limits)).
