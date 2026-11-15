# Production database and deploy

Production runs on Vercel, one project per app, with a Postgres database on Supabase. Locally, json-server stays the default database. The decision and its alternatives (Firestore, a self-hosted Postgres, Supabase Auth) are in [ADR 0010](../adr/0010-supabase-as-production-database.md).

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

Supabase is only the database, with no Supabase Auth, Storage or Realtime. The browser never talks to it: every query leaves the server with the secret key, through the adapters in `packages/infrastructure/src/supabase/`. `DATA_BACKEND` is read in one place, `createDataAdapters` in `packages/bff/src/composition/dataAdapters.ts`, so the use cases, handlers and screens are the same for both databases.

### Tables

The migrations are `supabase/migrations/0001_init.sql` and `0002_sessions_valid_after.sql`, run in that order.

| Table | Columns | Rules |
|---|---|---|
| `users` | `id`, `name`, `email`, `password_hash`, `sessions_valid_after` | Email unique in any case (`lower(email)`). Name from 1 to 100 characters. `sessions_valid_after` is when the user last ended their sessions ([security.md](security.md#ending-every-session)) |
| `transactions` | `id`, `user_id`, `type`, `amount_in_cents`, `date`, `attachment` | `user_id` references `users` with `on delete cascade`. `type` is one of the 7 codes. Positive amount. Index on `(user_id, date desc)` |
| `password_reset_tokens` | `id`, `user_id`, `token_hash`, `expires_at`, `used_at` | Only the hash of the token |
| `rate_limits` | `key`, `window_start`, `hits` | One counter per key and window. The key is an HMAC, so no email or IP is stored ([security.md](security.md#keys-of-the-rate-limits)) |

Ids are text, because the domain creates them and the seed uses `"1"` and `"2"`. The attachment column holds the encrypted value, never the file.

Three functions give the guarantees that json-server lacks. `use_password_reset_token(id)` claims a token in one `update ... where used_at is null`, so of two simultaneous calls only one succeeds. `consume_rate_limit(key, max, window)` locks the row of the key and counts the attempt. `release_rate_limit(key)` gives the last attempt back.

### Why RLS with no policy

Supabase exposes every table of `public` through a REST API that anyone with the publishable key can call. Access control here is the Auth.js session, checked by the bff, not the database. So RLS is on with no policy, which denies every row, and the default grants of `anon` and `authenticated` are revoked. The secret key uses `service_role`, which bypasses RLS, and lives only on the server. A request with the publishable key gets `401` with code `42501` on every table and function.

### Vercel

`next.config.ts` of the shell builds its rewrites from `DASHBOARD_URL` and `TRANSACTIONS_URL` (`packages/utils/src/zoneRewrites.ts`), the same code as in development and Docker. On Vercel a missing host stops the build. The hosts are read at build time, so a new URL needs a new deploy.

The three `vercel.json` set `regions: ["iad1"]`, the region of the database, so every query stays in Washington, D.C. HSTS goes out only on production deployments. The reset link uses `SHELL_URL`. `/sobre` reads its counts through `createDataAdapters().statistics`, so it works with both databases.

### No email in production

Production has no email service. Password recovery is shown locally with Mailpit. With no `SMTP_HOST`, the shell uses `DisabledEmailSender`: "Esqueci a senha" answers the usual message, the token is still created, and the server logs one line with no address: `Email sending is disabled (SMTP_HOST is not set): a message was not sent`.

## Configuration

### Variables of the database

| Variable | Note |
|---|---|
| `DATA_BACKEND` | `json-server` (default) or `supabase`. Any other value stops the app |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Required with `supabase`. The secret key is server only, never `NEXT_PUBLIC_` |
| `JSON_SERVER_URL` | Required with `json-server` |
| `SUPABASE_PUBLISHABLE_KEY` | Only in `.env`, to prove that it reads nothing. The apps do not use it |

A missing variable says which one and why, for example `Missing required environment variable: SUPABASE_URL (DATA_BACKEND is supabase)`. The build never needs them.

### Variables per Vercel project

Set them for the Production environment.

**shell**

| Variable | Value | Secret |
|---|---|---|
| `DATA_BACKEND` | `supabase` | no |
| `SUPABASE_URL` | Supabase → Project Settings → Data API → API URL, without `/rest/v1/` | no |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys, the key created for production. Same in the 3 projects | yes |
| `NEXTAUTH_SECRET` | Generated (below). Same in the 3 projects | yes |
| `NEXTAUTH_URL`, `SHELL_URL`, `ALLOWED_ORIGINS` | `https://bytebank-shell.vercel.app` | no |
| `DASHBOARD_URL` | `https://bytebank-dashboard.vercel.app` (build time) | no |
| `TRANSACTIONS_URL` | `https://bytebank-transactions-virid.vercel.app` (build time) | no |

**dashboard**

| Variable | Value | Secret |
|---|---|---|
| `DATA_BACKEND`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `NEXTAUTH_SECRET` | The same as the shell | as above |
| `ATTACHMENT_ENCRYPTION_KEY` | Generated (below). Same in dashboard and transactions | yes |
| `NEXTAUTH_URL` | `https://bytebank-dashboard.vercel.app` | no |
| `SHELL_URL`, `ALLOWED_ORIGINS` | `https://bytebank-shell.vercel.app` | no |

**transactions** uses the same as the dashboard, with `NEXTAUTH_URL` set to `https://bytebank-transactions-virid.vercel.app`.

No project sets an SMTP variable, and the demonstration variables (`SESSION_MAX_AGE_SECONDS`, `IDLE_TIMEOUT_SECONDS`, `IDLE_WARNING_SECONDS`) stay unset. Earlier deploys used a json-server on Railway, so delete these if they are still in a panel: `NEXT_PUBLIC_API_URL` (public, and nothing reads it), `NEXTAUTH_API_URL`, `JSON_SERVER_URL`, `SMTP_*`, `MAIL_FROM` (any of them would turn the email on) and `DOCKER`.

### Secrets of production

The production secrets are new, different from the local ones. Generate `NEXTAUTH_SECRET` and `ATTACHMENT_ENCRYPTION_KEY` separately; the apps refuse anything that is not 32 random bytes in base64 ([security.md](security.md#secrets)):

```sh
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

For `SUPABASE_SECRET_KEY`, create a key named for example `vercel-production` in Supabase → Project Settings → API Keys, so it can be revoked without touching the local one. A new `ATTACHMENT_ENCRYPTION_KEY` cannot open attachments encrypted with another key, so local and production attachments show "Anexo indisponível" to each other.

### Build settings

| Setting | shell | dashboard | transactions |
|---|---|---|---|
| Framework Preset | Next.js | Next.js | Next.js |
| Root Directory | `apps/shell` | `apps/dashboard` | `apps/transactions` |
| Include files outside the Root Directory | on | on | on |
| Install and Build Command | from `vercel.json` | from `vercel.json` | from `vercel.json` |
| Node.js Version | 22.x | 22.x | 22.x |

`vercel.json` runs `cd ../.. && npm ci` and `cd ../.. && npx turbo build --filter=@bytebank/<app>`, so the overrides of the panel stay off.

### Order of the steps

1. Run `0001_init.sql` and then `0002_sessions_valid_after.sql` in the SQL Editor of Supabase, before deploying code that reads the new column. Create the production secret key, and leave only the demonstration data with `npm run db:reset:supabase`.
2. Generate `NEXTAUTH_SECRET` and `ATTACHMENT_ENCRYPTION_KEY`.
3. Configure dashboard and transactions, delete the old variables, add the new ones, and redeploy with the build cache off.
4. Configure the shell last, since its build reads the URLs of the zones.
5. Test the production deployment, as below.

## Running locally against Supabase

1. Run the two migrations in order in the SQL Editor of the project.
2. Put `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in the `.env` of the root.
3. Seed the demonstration with `npm run db:seed:supabase`. It only adds what is missing.
4. Start with the variable, in PowerShell:

   ```powershell
   $env:DATA_BACKEND='supabase'; docker compose up -d --build; Remove-Item Env:DATA_BACKEND
   ```

5. Go back with `docker compose up -d`, then `npm run db:reset` and `docker compose restart json-server`.

`npm run db:clean:supabase` deletes the demonstration users and everything that belongs to them. `npm run db:reset:supabase` empties every table and seeds the demonstration again.

### HTTPS inspected by an antivirus

An antivirus that inspects HTTPS, such as Avast, signs connections with its own root certificate. Windows trusts it and the Linux containers do not, so they refuse Supabase with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`. Export that root from the Windows certificate store to a PEM file, and pass it to the three app containers in an override file kept out of git:

```yaml
services:
  shell:
    environment:
      - NODE_EXTRA_CA_CERTS=/etc/local-ca.pem
    volumes:
      - "C:/path/to/local-ca.pem:/etc/local-ca.pem:ro"
  # the same for dashboard and transactions
```

Then start with `docker compose -f docker-compose.yml -f <override>.yml up -d`.

## How to validate

### Contract tests

`packages/infrastructure/src/contracts` holds one contract suite per port: users, the end of the sessions, transactions, reset tokens and rate limits. The same cases run against json-server in `npm test` and against Supabase on demand:

```powershell
$env:SUPABASE_CONTRACT_TESTS='1'; npx vitest run supabase.contract; Remove-Item Env:SUPABASE_CONTRACT_TESTS
```

Everything a run creates has its own prefix and is deleted at the end. Three cases are skipped for json-server because it cannot hold them: a duplicate email, two registrations at the same time, and two claims of one reset link at the same time. Against Supabase every case runs ([testing.md](testing.md)).

### Deploy test

On https://bytebank-shell.vercel.app, in a private window:

1. Log in with the demonstration user and open the dashboard and the extract.
2. Create, edit and delete a transaction, and open an attached image.
3. Change the name in "Minha conta" and check the header.
4. Use "Esqueci a senha": the usual message appears, and the Vercel logs of the shell show the line about the disabled email.
5. Open `/sobre`, whose counts come from Supabase.
6. Check HSTS with `curl -sI https://bytebank-shell.vercel.app/ | grep -i strict-transport-security`.
7. Check in the Vercel logs that the functions run in `iad1`.
8. Leave with "Sair" and open `/dashboard`: the login comes back.
9. Run `npm run test:session-race` against production ([testing.md](testing.md#browser-regression-the-session-race)), then `npm run db:reset:supabase`.

A Preview deployment uses Preview variables, which this checklist does not set, so test on Production.

## Known limits

- The migrations run by hand in the SQL Editor, and nothing records which ones ran.
- Expired tokens and old rate-limit rows are never deleted ([security.md](security.md#next-phase)).
- The guarantees that only Postgres gives are listed in [security.md](security.md#known-limits).
