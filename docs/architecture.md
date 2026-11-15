# Architecture

Bytebank is a Turborepo monorepo with npm workspaces. Three independent Next.js apps are served as one site through Multi-Zones, and seven packages hold the code. The apps keep only routes, pages, layouts and the assembly of the pieces.

```text
tech-challenge-fiap/
├─ apps/
│  ├─ shell/          → landing, login, registration, recovery, /sobre, proxy of the zones (port 3000)
│  ├─ dashboard/      → balance, charts, new transaction, Minha conta (port 3003, basePath /dashboard)
│  └─ transactions/   → extract, filters, search, pagination (port 3002, basePath /transactions)
├─ packages/
│  ├─ core/           → domain, use cases and ports, no framework
│  ├─ infrastructure/ → adapters: json-server, Supabase, scrypt, AES-GCM, SMTP
│  ├─ bff/            → HTTP handlers with no framework, composition, browser clients
│  ├─ store/          → RTK Query factory, store, provider, RxJS search
│  ├─ auth/           → NextAuth of the zones, proxy, session config shared with the shell
│  ├─ utils/          → pure helpers: formatting, session policy, secrets, headers, rewrites
│  └─ design-system/  → UI components, hooks, theme, header and menus
├─ supabase/migrations/
├─ docker-compose.yml
└─ turbo.json
```

What each package does is in [fase4/modularization.md](fase4/modularization.md), and the rules between them in [conventions.md](conventions.md).

## Layers

```text
 Browser
   │
   ▼
 apps (Next.js): pages, layouts, route files, proxy.ts
   │        uses: design-system, store, auth
   ▼
 bff: origin check → session → Zod → use case → HTTP answer
   │
   ▼
 core: entities, value objects, use cases, ports        ◀── infrastructure implements the ports
                                                             (json-server or Supabase, crypto, email)
```

Dependencies point inward. The core depends on nothing, the infrastructure and the bff depend on the core, and the apps assemble the pieces. ESLint enforces the direction ([conventions.md](conventions.md#layers)), and `server-only` keeps server code out of the browser ([fase4/security.md](fase4/security.md#server-only-entries)). The decisions are in [ADR 0004](adr/0004-use-cases-depend-on-ports.md), [ADR 0005](adr/0005-infrastructure-as-separate-package.md) and [ADR 0007](adr/0007-bff-with-framework-agnostic-handlers.md).

## Why Multi-Zones

Module Federation does not support Next.js 16 with the App Router, and single-spa conflicts with its routing. Multi-Zones is the official Next.js approach to micro-frontends and the one endorsed by the course ([Next.js docs](https://nextjs.org/docs/app/building-your-application/deploying/multi-zones)).

Each zone builds and deploys on its own, so a change in one does not rebuild the others. Moving between zones is a full page load, which the project accepts ([fase4/performance.md](fase4/performance.md#preloading)).

## Communication between zones

The browser only talks to the shell. `next.config.ts` of the shell rewrites `/dashboard/*` and `/transactions/*` to the zones, with the hosts read from `DASHBOARD_URL` and `TRANSACTIONS_URL` (`packages/utils/src/zoneRewrites.ts`):

| Environment | `/dashboard/*` | `/transactions/*` |
|---|---|---|
| `npm run dev` | `http://localhost:3003` | `http://localhost:3002` |
| Docker | `http://dashboard:3003` | `http://transactions:3002` |
| Vercel | `https://bytebank-dashboard.vercel.app` | `https://bytebank-transactions-virid.vercel.app` |

Each zone has a basePath, so its pages, chunks and API routes live under its prefix. Links inside a zone use `next/link`, and links between zones use a plain `<a>`.

## Authentication

Auth.js (NextAuth v5) in the shell holds the only login and keeps a JWT session in a cookie. The three apps share `NEXTAUTH_SECRET`, so the zones read the cookie of the shell. Each app has a `proxy.ts`: the shell protects `/dashboard` and `/transactions`, and each zone protects its own pages, so a zone stays protected when the shell is bypassed. Every check of a session also confirms on the server that the user has not ended it ([fase4/security.md](fase4/security.md#ending-every-session)).

## State

Both zones keep server data in RTK Query, built by the same factory of `@bytebank/store`. No component calls `fetch` on its own: the zones use `createTransactionsClient(basePath)` and the shell uses `createShellClient()`, both from `@bytebank/bff/client`. The zones share no client store ([fase4/state-management.md](fase4/state-management.md)).

## Rendering

The CSP nonce exists only per request, so every page renders on demand ([fase4/performance.md](fase4/performance.md#no-page-is-static)).

| Page | Rendering | Why |
|---|---|---|
| Public pages of the shell | Server, per request | The CSP nonce |
| `/sobre` | Server, per request | Counts read from the database with `createDataAdapters().statistics` |
| `/dashboard/account` | Server, per request | The data of the user |
| Dashboard and extract | Layout on the server with the session, data in the browser | Interactivity with RTK Query |

## Docker

Each app has a multistage Dockerfile on `node:22-alpine`. The `deps` stage runs `npm ci` with a `COPY` of every workspace `package.json`, the `builder` stage runs `npx turbo build --filter=@bytebank/<app>`, and the `runner` stage keeps only `.next/standalone` and runs as a non-root user.

Docker Compose runs six services on the `bytebank` network:

| Service | Port on the machine | Role |
|---|---|---|
| `secrets-check` | none | Checks `NEXTAUTH_SECRET` and `ATTACHMENT_ENCRYPTION_KEY`; the apps start only if it succeeds |
| `json-server` | none | The local database, reachable only inside the network |
| `mailpit` | 8025, on `127.0.0.1` | The inbox of the recovery emails |
| `shell` | 3000 | The entry point |
| `dashboard` | 3003 | Published, but used through the shell |
| `transactions` | 3002 | Published, but used through the shell |

## Deploy

| Service | Platform | URL |
|---|---|---|
| shell | Vercel | https://bytebank-shell.vercel.app |
| dashboard | Vercel | https://bytebank-dashboard.vercel.app |
| transactions | Vercel | https://bytebank-transactions-virid.vercel.app |
| database | Supabase (Postgres, us-east-1) | server only, with the secret key |

The functions run in `iad1`, the region of the database. Production uses Supabase (`DATA_BACKEND=supabase`), and json-server serves only local development. `DATA_BACKEND` is read in one place, `createDataAdapters` in the bff. Configuration and checklist are in [fase4/deploy.md](fase4/deploy.md).
