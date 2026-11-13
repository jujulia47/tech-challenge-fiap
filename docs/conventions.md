# Code conventions

The rules every change follows. Lint and the tests check most of them; the others are reviewed by hand.

## Languages

| What | Language |
|---|---|
| Code: variables, functions, components, types, interfaces, files, folders | English |
| Comments and docs under `docs/` | English |
| Text the user sees: labels, placeholders, messages, toasts | Portuguese |
| `aria-label` and other text for screen readers | Portuguese, for pt-BR screen readers |
| Commit messages | English |

`README.md` and `docs/architecture.md` are in Portuguese, the language they were written in.

## TypeScript

- No `any`, no `@ts-ignore`: `tseslint.configs.recommended` refuses both. Fix the type instead.
- Props always have a named interface, such as `interface CardChartsProps`.
- No `console.log` in production code. Server code that must log uses the logger it is given, or `console.error` / `console.warn` with no personal data.

## Files and components

- At most 200 lines per file. Split it when it grows.
- One responsibility per component.
- Server Components by default. `'use client'` only where hooks, events or state need it.
- No inline styles, except dynamic values that no class can express.

## Where each thing goes

The apps are thin: routes, pages, layouts and the assembly of the pieces. No file is copied between apps; a difference between zones becomes a prop or a factory.

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

A new UI component is created in the design system, never in an app. The same goes for a block of screen behavior that two zones share, such as the actions of a transaction with their modals and toast (`TransactionActions`): it is a design system component, which takes the data of the zone by props, such as the mutations of its store, and gives the page what it needs by a render prop. The design system never imports the store.

## Imports

- In the apps, always the alias `@/`, never `../` between folders.
- Inside a package, relative imports. There is no `@/` in the packages, on purpose, so that they are not tied to an app.
- Between packages, always by name (`@bytebank/...`), from the most specific entry available.

### Layers

Each package has an `eslint.config.mjs` built from `eslint.layers.mjs` at the root, with the native rule `no-restricted-imports`. An import in the wrong direction fails `npm run lint`, with a message that explains the layer.

| Package | May not import |
|---|---|
| `core` | `react`, `react-dom`, `next`, `next-auth`, `@supabase/*`, `json-server`, `nodemailer`, and any other `@bytebank/*` |
| `infrastructure` | `react`, `react-dom`, `next`, `next-auth`, `@bytebank/bff`, `store`, `auth`, `design-system` |
| `bff` | `react`, `react-dom`, `next` |
| `store`, `design-system` | `@bytebank/infrastructure`, `@bytebank/bff`, except `@bytebank/bff/client` |

`auth` and `utils` have no layer rule: `auth` is the bridge between Next and the bff, and `utils` imports only `core`.

### Server only

The server entries import `server-only`: `@bytebank/bff` (its main entry, with the composition and the handlers) and the server files of `@bytebank/auth`. A Client Component that reaches one of them fails the build. `@bytebank/bff/client` runs in the browser and has no such import. `@bytebank/infrastructure` has none either, because Node scripts with no bundler use it (`db:reset:supabase`). See `docs/fase4/security.md`.

## Style

- Tailwind CSS with the tokens of `packages/design-system/src/styles/theme.css`, the single theme of the three apps. Never a hex color in a component; the only exception is the `COLORS` array of Recharts.
- `rounded-md` (8 px) is the radius of the project.
- Icons come from a subset font: a new icon goes into `packages/design-system/fonts/icons.txt`, and the font is generated again (`docs/fase4/performance.md`, "Icon font").
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
- The rules of core have specification tests; a port has a contract suite that every adapter passes (`docs/fase4/deploy.md`).
- **Every component of the design system has a story** in `apps/shell/src/components/ui/`, with its main states and with no real data or request: props and decorators only.
- **Every interactive component has an interaction test**, a `play` function in its story, run by the Storybook tests (`docs/fase4/testing.md`).
- What only a browser shows, such as the session race, has a script under `apps/shell/scripts/`, documented in `docs/fase4/testing.md`.

## Commits

Conventional commits, in English: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`, with a scope when it helps (`chore(deps):`). One subject line in the imperative, and a body when the reason is not obvious.

## A new package

1. `package.json` with the name `@bytebank/<name>`, `tsconfig.json`, `src/`, and an `eslint.config.mjs` that calls `packageLintConfig('<name>')`; add a rule to `eslint.layers.mjs` if the package is a layer.
2. `COPY packages/<name>/package.json` in the three Dockerfiles.
3. The package in `transpilePackages` of each app that uses it.

## Secrets and environment

- Values of `.env` and secrets are never committed, logged or shown. `.env.example` lists the names only.
- `NEXTAUTH_SECRET` and `ATTACHMENT_ENCRYPTION_KEY` are 32 random bytes in base64. The apps refuse to start with a missing, example or short value (`docs/fase4/security.md`).
- A variable read by the browser has the `NEXT_PUBLIC_` prefix; nothing secret ever does.
