# Modular architecture

Bytebank is a Turborepo monorepo with npm workspaces. Three Next.js apps are served as one site through Multi-Zones, and seven packages hold the code, each with one responsibility. The apps keep only routes, pages, layouts and the assembly of the pieces. No file is copied between apps: a difference between zones becomes a prop or a factory argument.

| App | Port | basePath | Role |
|---|---|---|---|
| `apps/shell` | 3000 | none | Landing, login, registration, recovery, `/sobre`, and the proxy that serves the zones |
| `apps/dashboard` | 3003 | `/dashboard` | Balance, charts, new transaction, Minha conta |
| `apps/transactions` | 3002 | `/transactions` | Extract, filters, search and pagination |

| Package | Role | Depends on |
|---|---|---|
| `@bytebank/core` | Domain, use cases and ports, with no framework ([domain.md](domain.md)) | nothing |
| `@bytebank/infrastructure` | Adapters of the ports: json-server, Supabase, scrypt, AES-GCM, SMTP ([infrastructure.md](infrastructure.md)) | core |
| `@bytebank/bff` | HTTP handlers with no framework, the composition, and the browser clients in `@bytebank/bff/client` ([bff.md](bff.md)) | core, infrastructure, zod |
| `@bytebank/store` | RTK Query factory, store and provider, the RxJS search ([state-management.md](state-management.md)) | bff/client, Redux, RxJS |
| `@bytebank/auth` | NextAuth of the zones, their proxy, the session check, and the session config shared with the shell | bff, next-auth, next |
| `@bytebank/utils` | Pure helpers: formatting, session policy, secrets rule, security headers, zone rewrites | core |
| `@bytebank/design-system` | UI components, hooks, theme, header and menus, documented in Storybook | utils, bff/client |

ESLint enforces the direction of these dependencies (`eslint.layers.mjs`). The forbidden imports of each layer and the rule for where new code goes are in [conventions.md](../conventions.md#layers).

## How the zones work together

The browser only talks to the shell. Its `next.config.ts` rewrites `/dashboard/*` and `/transactions/*` to the zones, with hosts from `DASHBOARD_URL` and `TRANSACTIONS_URL` (`packages/utils/src/zoneRewrites.ts`), the same code in development, Docker and Vercel. Each zone has its own basePath, proxy, CSP and session reader. The choice of Multi-Zones over Module Federation and single-spa is explained in [architecture.md](../architecture.md#why-multi-zones).

`next/link` adds the basePath of the current app and only navigates inside it. So links inside a zone use `next/link` with a path relative to the zone, and links between zones use a plain `<a>` or `window.location` with the absolute path, which loads the whole page. The four `window.location` lines carry a justified lint suppression of `no-location-assign-relative-destination`.

The menus take their items by prop, as `{ label, href, crossZone? }`, and render `next/link` or `<a>` from `crossZone`. Each app keeps only its `nav-items.ts`. In the transactions zone, "Minha conta" points to `/dashboard/account` with `crossZone`, since that page lives in the dashboard.

The zones share no client store. Moving between them reloads the page, so each zone starts with an empty cache and reads from the server.

## Shared code

| What | Where |
|---|---|
| `useToast`, `useCurrencyInput`, `useUser`, `useFileAttachment` | `@bytebank/design-system` |
| The transaction modals and `preloadActionModal` | `@bytebank/design-system`. The edit modal saves through an `onSave` prop, so the design system does not depend on the store |
| The actions of a transaction: detail, edit, delete with confirmation, the three lazy modals and the toast | `TransactionActions` in `@bytebank/design-system`. The zone passes its transactions and mutations by props, and gets the actions and `showToast` back by a render prop |
| `Header`, `MenuDrawer`, `MenuSidebar`, `MenuTabs`, `ProfileMenu` | `@bytebank/design-system`, with items by prop |
| The content of the 404 pages | `NotFoundMessage`, with destination and text by prop |
| Theme, typography and icon font | `@bytebank/design-system/theme.css`, imported by the three layouts and by Storybook |
| Store and provider | `createTransactionsProvider(api)` in `@bytebank/store`, called with the basePath of each zone |
| The handlers of the zones | `createLazyTransactionHandlers(getUserId)` in `@bytebank/bff`, with the session passed in as a function |
| NextAuth instance, proxy logic, session config | `@bytebank/auth`. The shell adds its login provider to the shared config |
| `cn`, `formatCents`, presentation of amounts, dates and types | `@bytebank/utils` |

A few files repeat in each app on purpose. Next needs one `app/api/*/route.ts` per zone, and those files only call the handlers. Next reads `export default` and the `matcher` of `proxy.ts` from the app folder, so each zone re-exports `@bytebank/auth/zoneProxy` there. `next-env.d.ts`, `postcss.config.mjs` and `eslint.config.mjs` belong to each app.

`TransactionActions` removed the code that the two zone pages repeated. Comparing windows of 6 normalized lines, the repetition between apps went from 30 windows to 22, with the two pages going from 8 to 0. What remains is in the layouts of the two zones and in the lists of `CardStatement` and `StatementResults`.

## The `cn` fix

`packages/utils/src/cn.ts` uses `extendTailwindMerge` to put the typography tokens of the design system (`text-body`, `text-heading`, `text-icon-sm` and the others) in the `font-size` group. Before, `tailwind-merge` read them as colors and dropped them when a color followed, so `Button`, `Select`, `Input` and `Toast` had lost their typography.

| Call | Before | After |
|---|---|---|
| `cn('text-body-semibold', 'text-inverse')` | `text-inverse` | `text-body-semibold text-inverse` |
| `cn('text-icon-sm', 'text-success')` | `text-success` | `text-icon-sm text-success` |
| `cn('text-heading', 'text-sm')` | `text-heading text-sm` | `text-sm` |

`cn.test.ts` compares its token list with `theme.css`, so a token added to the CSS but not to `cn.ts` fails the test.

## Tailwind `@source`

Tailwind v4 only generates CSS for the classes it finds in the files it scans, starting at the working directory of the app. The components live in another package, so their classes were missing, the components rendered without styles, and the build still passed. `theme.css` registers the design system folder with `@source "../"`. Removing it makes classes such as `min-w-36` and `disabled:cursor-not-allowed` disappear from the CSS of the three apps.

## `transpilePackages`

Each `next.config.ts` lists the workspace packages that the app uses. Turbopack would transpile them anyway, but the list records which packages each app compiles. A new package also needs a `COPY packages/<name>/package.json` in the three Dockerfiles ([conventions.md](../conventions.md#a-new-package)).

## How to validate

- `npm run lint` fails on an import in the wrong direction and names the layer.
- `npm run build` builds the three apps from the packages, and `docker compose up -d --build` runs a real `npm ci` with every package.
- No app has local copies of hooks or helpers: `grep -r "use-toast\|lib/utils" apps/*/src` finds nothing.
- In the browser, through http://localhost:3000, the menus of both zones reach the right pages, and "Minha conta" from the extract opens `/dashboard/account`.

## Known limits

- The default profile items of the shell use `next/link` for another zone, which still works through a full load.
- The active highlight never matches the cross-zone items of the transactions zone, since those pages are not in that zone.
- The layouts of the two zones and the two transaction lists still share code.
