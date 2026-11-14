# Architecture

Bytebank is a Turborepo monorepo (npm workspaces) with three independent Next.js apps, served as one site through Next.js Multi-Zones, and seven packages that hold the code. The apps are thin: routes, pages, layouts and the assembly of the pieces.

## Structure

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

What each package does and the rules between them: [fase4/modularization.md](fase4/modularization.md) and [conventions.md](conventions.md).

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

Dependencies point inward: the core depends on nothing, the infrastructure and the bff depend on the core, and the apps assemble the pieces. ESLint enforces the direction ([conventions.md](conventions.md#layers)), and `server-only` keeps server code out of the browser ([fase4/security.md](fase4/security.md#server-only-entries)). Decisions: [ADR 0004](adr/0004-use-cases-depend-on-ports.md), [ADR 0005](adr/0005-infrastructure-as-separate-package.md) and [ADR 0007](adr/0007-bff-with-framework-agnostic-handlers.md).

## Why Multi-Zones

Multi-Zones were chosen over Module Federation and single-spa:

- **Module Federation** does not support Next.js 16 with the App Router.
- **single-spa** conflicts with the routing of the App Router.
- **Multi-Zones** is the official Next.js approach to micro-frontends, and the one endorsed by the course.

Each zone is built and deployed on its own, and a change in one does not rebuild the others. The cost is that moving between zones is a full page load, which the project accepts ([fase4/performance.md](fase4/performance.md#preloading)). Reference: https://nextjs.org/docs/app/building-your-application/deploying/multi-zones

## Communication between zones

The browser only talks to the shell. `next.config.ts` of the shell rewrites `/dashboard/*` and `/transactions/*` to the zones, with the hosts read from `DASHBOARD_URL` and `TRANSACTIONS_URL` (`packages/utils/src/zoneRewrites.ts`), the same code in development, Docker and Vercel:

| Environment | `/dashboard/*` | `/transactions/*` |
|---|---|---|
| `npm run dev` | `http://localhost:3003` | `http://localhost:3002` |
| Docker | `http://dashboard:3003` | `http://transactions:3002` |
| Vercel | `https://bytebank-dashboard.vercel.app` | `https://bytebank-transactions-virid.vercel.app` |

Each zone has a basePath, so its pages, chunks and API routes live under its prefix. Links inside a zone use `next/link`; links between zones use a plain `<a>`, a full page load.

## Authentication

Auth.js (NextAuth v5) in the shell holds the only login and issues a JWT session in a cookie. The same `NEXTAUTH_SECRET` is shared by the three apps, so the zones read the cookie of the shell without a login of their own. Each app has a `proxy.ts`: the shell protects `/dashboard` and `/transactions`, and each zone protects its own pages, so a zone stays protected even when the shell is bypassed. Details: [fase4/security.md](fase4/security.md).

## State

Both zones keep server data in RTK Query, built by the same factory of `@bytebank/store`. No component calls `fetch` on its own: the zones use `createTransactionsClient(basePath)` and the shell uses `createShellClient()`, both typed clients of `@bytebank/bff/client`, with the same error codes. The zones do not share a client store. Details: [fase4/state-management.md](fase4/state-management.md).

## Rendering

The CSP nonce exists per request, so every page is rendered on demand ([fase4/performance.md](fase4/performance.md#no-page-is-static)).

| Page | Strategy | Why |
|---|---|---|
| Landing and the public pages of the shell | Server render per request | The nonce of the CSP |
| `/sobre` | Server render per request | Counts read from the database (`createDataAdapters().statistics`) |
| `/dashboard/account` | Server render per request | The user's data |
| Dashboard and extract | Server render of the layout (with the session), data in the client | Interactivity with RTK Query |

## Docker

Each app has a multistage Dockerfile on `node:22-alpine`:

1. **deps**: installs the dependencies with `npm ci`, with a `COPY` of the `package.json` of every workspace;
2. **builder**: `npx turbo build --filter=@bytebank/<app>`;
3. **runner**: only `.next/standalone`, as a non-root user.

Docker Compose runs six services on the `bytebank` network:

| Service | Port on the machine | Role |
|---|---|---|
| `secrets-check` | none | Checks `NEXTAUTH_SECRET` and `ATTACHMENT_ENCRYPTION_KEY` and exits; the apps start only if it succeeds |
| `json-server` | none | The local database, reachable only inside the network |
| `mailpit` | 8025, on `127.0.0.1` only | The inbox of the recovery emails; its SMTP stays inside the network |
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

The three `vercel.json` set the functions in `iad1` (Washington, D.C.), the region of the database, so every query stays in one region. Production uses Supabase (`DATA_BACKEND=supabase`); json-server is only for local development and Docker. `DATA_BACKEND` is read in one place, `createDataAdapters` in the bff. Configuration and checklist: [fase4/deploy.md](fase4/deploy.md).
