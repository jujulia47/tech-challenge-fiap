# Code conventions

The rules every change follows. Lint and the tests check most of them, and the rest are reviewed by hand.

## Languages

| What | Language |
|---|---|
| Code: variables, functions, components, types, interfaces, files, folders | English |
| Comments and docs under `docs/` | English |
| Text the user sees: labels, placeholders, messages, toasts | Portuguese |
| `aria-label` and other text for screen readers | Portuguese, for pt-BR screen readers |
| Commit messages | English |

`README.md` and the index `docs/README.md` are in Portuguese, for the evaluators of the course. Every other doc is in English.

## TypeScript

- No `any` and no `@ts-ignore`. `tseslint.configs.recommended` refuses both, so fix the type instead.
- Props always have a named interface, such as `interface CardChartsProps`.
- No `console.log` in production code. Server code that must log uses the logger it is given, or `console.error` / `console.warn` with no personal data.

## Files and components

- At most 200 lines per file. Split it when it grows.
- One responsibility per component.
- Server Components by default. `'use client'` only where hooks, events or state need it.
- No inline styles, except dynamic values that no class can express.

## Where each thing goes

The apps keep only routes, pages, layouts and the assembly of the pieces. No file is copied between apps, and a difference between zones becomes a prop or a factory.

| What | Where |
|---|---|
| A business rule | `@bytebank/core` |
| An adapter of a port of core: database, hash, cipher, email | `@bytebank/infrastructure` |
| Server composition of the use cases, HTTP handlers with no framework | `@bytebank/bff` |
| What the browser uses to call the bff | `@bytebank/bff/client` |
| Client state: RTK Query API, store, provider | `@bytebank/store`; each zone only calls the factories with its basePath |
| Authentication of the zones: NextAuth instance, proxy, session config shared with the shell | `@bytebank/auth` |
| A UI component or hook, the header and the menus (items by prop) | `@bytebank/design-system` |
| A pure helper shared by several packages | `@bytebank/utils` |

A new UI component goes in the design system, never in an app. So does a block of screen behavior that two zones share, such as `TransactionActions`, which takes the data of the zone by props and gives the page what it needs by a render prop. The design system never imports the store.

## Imports

- In the apps, always the alias `@/`, never `../` between folders.
- Inside a package, relative imports. The packages have no `@/` on purpose, so they are not tied to an app.
- Between packages, always by name (`@bytebank/...`), from the most specific entry available.

### Layers

Each package has an `eslint.config.mjs` built from `eslint.layers.mjs` at the root, with the native rule `no-restricted-imports`. An import in the wrong direction fails `npm run lint`, with a message that explains the layer.

| Package | May not import |
|---|---|
| `core` | `react`, `react-dom`, `next`, `next-auth`, `@supabase/*`, `json-server`, `nodemailer`, and any other `@bytebank/*` |
| `infrastructure` | `react`, `react-dom`, `next`, `next-auth`, `@bytebank/bff`, `store`, `auth`, `design-system` |
| `bff` | `react`, `react-dom`, `next` |
| `store`, `design-system` | `@bytebank/infrastructure`, `@bytebank/bff`, except `@bytebank/bff/client` |

`auth` and `utils` have no layer rule. `auth` is the bridge between Next and the bff, and `utils` imports only `core`.

### Server only

The main entry of `@bytebank/bff` and the server files of `@bytebank/auth` import `server-only`, so a Client Component that reaches them fails the build. `@bytebank/bff/client` runs in the browser and does not import it, and neither does `@bytebank/infrastructure`, which Node scripts such as `db:reset:supabase` also use ([fase4/security.md](fase4/security.md#server-only-entries)).

## Style

- Tailwind CSS with the tokens of `packages/design-system/src/styles/theme.css`, the one theme of the three apps. No hex color in a component, except the `COLORS` array of Recharts.
- `rounded-md` (8 px) is the radius of the project.
- Icons come from a subset font. A new icon goes into `packages/design-system/fonts/icons.txt`, and the font is generated again ([fase4/performance.md](fase4/performance.md#icon-font)).
- `cn()` of `@bytebank/utils` joins classes, with the typography tokens known to tailwind-merge.

## Accessibility

- Semantic HTML: `main`, `header`, `nav`, `section`, headings in order.
- Icon buttons always have an `aria-label` in Portuguese.
- Images always have `alt`.
- Navigation menus use `ul` and `li`.
- Error messages have `role="alert"` and `aria-live="polite"`.
- Every interactive element shows `focus-visible`.

## Tests

- Unit tests sit next to the module they test, as `*.test.ts`, and run with `npm test` (Vitest, Node environment).
- The rules of the core have specification tests, and each port has a contract suite that every adapter passes ([fase4/deploy.md](fase4/deploy.md#contract-tests)).
- Every component of the design system has a story in `apps/shell/src/components/ui/`, with its main states, built from props and decorators only.
- Every interactive component has an interaction test, a `play` function in its story ([fase4/testing.md](fase4/testing.md#storybook)).
- What only a browser shows, such as the session race, has a script under `apps/shell/scripts/` ([fase4/testing.md](fase4/testing.md)).

## Commits

Conventional commits, in English: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, with a scope when it helps (`chore(deps):`). One subject line in the imperative, and a body when the reason is not obvious.

## A new package

1. `package.json` with the name `@bytebank/<name>`, `tsconfig.json`, `src/`, and an `eslint.config.mjs` that calls `packageLintConfig('<name>')`; add a rule to `eslint.layers.mjs` if the package is a layer.
2. `COPY packages/<name>/package.json` in the three Dockerfiles.
3. The package in `transpilePackages` of each app that uses it.

## Secrets and environment

- Values of `.env` and secrets are never committed, logged or shown. The `.env.example` files hold the local values and `replace-me` in place of each secret.
- `NEXTAUTH_SECRET` and `ATTACHMENT_ENCRYPTION_KEY` are 32 random bytes in base64. The apps refuse to start with a missing, example or short value ([fase4/security.md](fase4/security.md#secrets)).
- A variable read by the browser has the `NEXT_PUBLIC_` prefix, and nothing secret ever does.
