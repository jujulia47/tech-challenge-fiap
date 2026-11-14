# Modular architecture

Requirement: modular architecture. Bytebank is a Turborepo monorepo (npm workspaces) with three Next.js apps served as one site through Multi-Zones, and seven packages with one responsibility each. The apps are thin: routes, pages, layouts and the assembly of the pieces. No file is copied between apps: a difference between zones becomes a prop or a factory argument.

## The pieces

| App | Port | basePath | Role |
|---|---|---|---|
| `apps/shell` | 3000 | none | Landing, login, registration, recovery, `/sobre`, and the proxy that serves the zones under its origin |
| `apps/dashboard` | 3003 | `/dashboard` | Balance, charts, new transaction, Minha conta |
| `apps/transactions` | 3002 | `/transactions` | Extract, filters, search and pagination |

| Package | Role | Depends on |
|---|---|---|
| `@bytebank/core` | Domain, use cases and ports, no framework ([domain.md](domain.md)) | nothing |
| `@bytebank/infrastructure` | Adapters of the ports: json-server, Supabase, scrypt, AES-GCM, SMTP ([infrastructure.md](infrastructure.md)) | core |
| `@bytebank/bff` | HTTP handlers with no framework, the composition, and the browser clients in `@bytebank/bff/client` ([bff.md](bff.md)) | core, infrastructure, zod |
| `@bytebank/store` | RTK Query factory, store and provider, the RxJS search ([state-management.md](state-management.md)) | bff/client, Redux, RxJS |
| `@bytebank/auth` | NextAuth of the zones, proxy, binding of the session to the handlers, session config shared with the shell | bff, next-auth, next |
| `@bytebank/utils` | Pure helpers: formatting, session policy, secrets rule, security headers, zone rewrites | core |
| `@bytebank/design-system` | UI components, hooks, theme, header and menus, documented in Storybook | utils, bff/client |

The direction of the dependencies is enforced by ESLint (`eslint.layers.mjs`); the table of what each layer may not import is in [conventions.md](../conventions.md#layers). The rule of where each new thing goes is there too.

## How the zones work together

The browser only talks to the shell. Its `next.config.ts` rewrites `/dashboard/*` and `/transactions/*` to the zones, with the hosts from `DASHBOARD_URL` and `TRANSACTIONS_URL` (`packages/utils/src/zoneRewrites.ts`), the same code in development, Docker and Vercel. Each zone has its own basePath, its own proxy, its own CSP and its own session reader. The choice of Multi-Zones over Module Federation and single-spa is in [architecture.md](../architecture.md#why-multi-zones).

**Navigation between zones.** `next/link` adds the basePath of the current app and only navigates inside it. So:

- **Inside a zone:** `next/link` with a path relative to the zone (`/account` in the dashboard is `/dashboard/account`).
- **Between zones:** a plain `<a href>` or `window.location`, with the absolute path, which does a full page load. Login and logout work this way too; the four `window.location` lines have a justified lint suppression (`no-location-assign-relative-destination`).

The menus take their items by prop, each `{ label, href, crossZone? }`, and render `next/link` or `<a>` from `crossZone`. Each app keeps only its `nav-items.ts`:

| App | Profile menu items | `crossZone` |
|---|---|---|
| shell | Default (`/dashboard/account`, `/dashboard/coming-soon`) | no |
| dashboard | `/account`, `/coming-soon` | no |
| transactions | `/dashboard/account`, `/dashboard/coming-soon` | yes |

The zones do not share a client store: moving between them is a full page load, so each starts with an empty cache and reads from the server ([state-management.md](state-management.md)).

## Where the shared code lives

Everything that two apps used to copy now lives in a package:

| What | Where |
|---|---|
| `useToast`, `useCurrencyInput`, `useUser`, `useFileAttachment` | `@bytebank/design-system` |
| `ModalEditTransaction`, `ModalTransactionDetail`, `ModalConfirmDelete`, and the three lazy modals with `preloadActionModal` (`transactionModals.ts`) | `@bytebank/design-system`. The edit modal saves through an `onSave` prop, so the design system does not depend on the store |
| The actions of a transaction: the state of delete, edit and detail, the confirmation, the three lazy modals and the toast | `TransactionActions` in `@bytebank/design-system`. The zone gives its transactions and the mutations of its store by props, and gets the actions of its list and `showToast` by a render prop |
| `Header`, `MenuDrawer`, `MenuSidebar`, `MenuTabs`, `ProfileMenu` | `@bytebank/design-system` (`src/navigation`), items by prop |
| The content of the 404 pages | `NotFoundMessage`, destination and text by prop |
| The theme (tokens, typography, icon font) | `@bytebank/design-system/theme.css`, imported by the three layouts and by Storybook |
| Store and provider | `createTransactionsProvider(api)` in `@bytebank/store`, called with the basePath of each zone |
| The server module of the handlers | `createLazyTransactionHandlers(getUserId)` in `@bytebank/bff`; the session comes in as a function |
| The NextAuth instance, the proxy logic and the session config | `@bytebank/auth` (`./zone`, `./zoneProxy`, `./handlers`, `./sessionProvider`, and the main entry). The shell adds its login provider to the shared config |
| `cn`, `formatCents`, presentation of amounts, dates and types | `@bytebank/utils` |

**What stays the same in more than one app, on purpose:**

| File | Why |
|---|---|
| `app/api/*/route.ts` | Next needs one route file per zone. They only call the handlers |
| `proxy.ts` of the zones | Next reads `export default` and the `matcher` from this file, so it cannot come from a package. It only re-exports `@bytebank/auth/zoneProxy` |
| `next-env.d.ts`, `postcss.config.mjs`, `eslint.config.mjs` | Configuration that each app needs in its own folder |

### Repeated code, measured

Windows of 6 normalized lines that appear in more than one app:

| | Before `TransactionActions` | After |
|---|---|---|
| Total | 30 | 22 |
| The two `app/page.tsx` of the zones | 8 | 0 |
| The layouts of the two zones | 11 | 11 |
| The `api/transactions` routes | 6 | 6 |
| The list of `CardStatement` and of `StatementResults` | 5 | 5 |

The routes are repeated on purpose (above). The layouts and the two lists are the next candidates.

## The `cn` fix

`packages/utils/src/cn.ts` uses `extendTailwindMerge` to put the typography tokens of the design system in the `font-size` group: `text-meta`, `text-meta-semibold`, `text-body`, `text-body-semibold`, `text-nav`, `text-nav-bold`, `text-label`, `text-heading`, `text-display`, `text-icon-xs`, `text-icon-sm`, `text-icon-md`. Without it, `tailwind-merge` read them as text colors and dropped them when a color followed, in four copies of `cn`. Color tokens such as `text-inverse` stay in the color group. `cn.test.ts` compares its list with `theme.css`, so a token added to the CSS but not to `cn.ts` fails the test.

| Call | Before | After |
|---|---|---|
| `cn('text-body-semibold', 'text-inverse')` | `text-inverse` | `text-body-semibold text-inverse` |
| `cn('text-icon-sm', 'text-success')` | `text-success` | `text-icon-sm text-success` |
| `cn('text-body', 'text-meta')` | `text-meta` | `text-meta` |
| `cn('text-success', 'text-inverse')` | `text-inverse` | `text-inverse` |
| `cn('text-heading', 'text-sm')` | `text-heading text-sm` | `text-sm` |

This was an intended visual change: `Button`, `Select`, `Input` and `Toast` got their typography back. The Lighthouse and bundle baselines were measured with the bug present. `tailwind-merge` also treats `font-size` as conflicting with `leading-*`, so a `leading-*` placed before a typography token in the same `cn()` call is dropped; no call does that, since the `leading-*` classes are in plain `className` strings.

## Tailwind `@source`

The apps import the components from another workspace package, so their classes are not in the app folders. Tailwind v4 only generates CSS for classes it finds in the files it scans, starting at the working directory, so `packages/design-system` was not scanned: the components rendered without those styles, and **the build still passed**. `theme.css` of the design system registers its own folder with `@source "../"` (each app's stylesheet did it with a relative path before the single theme), as the Tailwind docs say ("Use `@source` to explicitly register source paths relative to the stylesheet", [detecting classes in source files](https://tailwindcss.com/docs/detecting-classes-in-source-files)).

**Proof.** Four classes that exist only in the design system, in the CSS generated by `npm run build`:

| Class | Why it was chosen | With `@source` | Without `@source` |
|---|---|---|---|
| `min-w-36` | `Button` width | found in the 3 apps | absent in the 3 apps |
| `disabled:cursor-not-allowed` | `Button` and `Input` disabled state | found in the 3 apps | absent in the 3 apps |
| `focus-within:outline-offset-2` | `Checkbox` focus | found in the 3 apps | absent in the 3 apps |
| `bg-text-primary/50` | `Modal` backdrop | found in the 3 apps | absent in the 3 apps |

| App | CSS with `@source` | CSS without `@source` |
|---|---|---|
| shell | 90.5 KB | 82.6 KB |
| dashboard | 55.5 KB | 43.9 KB |
| transactions | 53.4 KB | 39.9 KB |

`min-w-36` was also confirmed in the CSS inside the three Docker images. A missing `@source` only shows up visually, which is why this proof is recorded. (The CSS later shrank with the daisyUI include list, [performance.md](performance.md#lcp-on-mobile-a-fair-comparison).)

## `transpilePackages`

Each `next.config.ts` lists the workspace packages the app uses. The Next.js 16.4.3 docs say that "Turbopack transpiles workspace packages (npm, pnpm, or Yarn workspaces) in your monorepo automatically under both routers", so it is not required with Turbopack and the App Router. The entries are kept as an explicit record of which packages each app compiles, and a new package goes there and into the three Dockerfiles (`COPY packages/<name>/package.json`), as [conventions.md](../conventions.md#a-new-package) lists.

## How to validate

- `npm run lint` fails on an import in the wrong direction, with a message that names the layer.
- `npm run build` builds the three apps from the packages; `docker compose up -d --build` runs a real `npm ci` with the `COPY` of every package.
- No app has a `lib/utils`, `hooks/use-toast` or other copy: `grep -r "use-toast\|lib/utils" apps/*/src` finds nothing.
- In the browser, through http://localhost:3000: the menus of both zones reach the right pages, and "Minha conta" from the extract goes to `/dashboard/account`.

## Known limits

- The shell's default profile items use `next/link` to reach another zone, which works through a full load anyway.
- The active item highlight compares `usePathname()` with `href`, so it never matches the cross-zone items of the transactions zone, which is expected: those pages are not in that zone.
- The layouts of the two zones and the two transaction lists still share code (table above).
