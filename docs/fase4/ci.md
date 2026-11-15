# Continuous integration and dependencies

GitHub Actions (`.github/workflows/ci.yml`) runs lint, tests, build and two dependency audits on every push and pull request to `main`. Dependabot (`.github/dependabot.yml`) opens the dependency updates.

## Pipeline

The job `quality` runs on `ubuntu-latest` with `contents: read` permissions only, so a compromised step cannot push, comment or change issues. It uses no secret and no environment variable.

| Step | Command | Why |
|---|---|---|
| Checkout | `actions/checkout@v7` | The commit under test |
| Node | `actions/setup-node@v7`, `node-version: 22`, `cache: npm` | The same major as the Dockerfiles. json-server 1.0.0-beta.15 needs Node 22.12 or later |
| Install | `npm ci` | Follows `package-lock.json` exactly and fails if it is out of sync |
| Lint | `npx turbo lint` | ESLint in the 3 apps and 7 packages, layer rules included |
| Unit tests | `npm test` | Unit, integration and contract tests, with a real json-server ([testing.md](testing.md)) |
| Build | `npx turbo build` | Production build of the three apps, with the TypeScript check |
| Audit (production) | `npm audit --omit=dev --audit-level=high` | Blocking: a high or critical vulnerability in a production dependency fails the run |
| Audit (full) | `npm audit --audit-level=high`, `continue-on-error: true` | Informational: reports dev tooling without failing the run |

The build needs no secret, because the handlers and adapters are built on the first request and every page renders per request. The zone hosts are required only on Vercel.

Production dependencies ship in the images and deployments and handle real requests, so a high or critical finding there must stop the merge. Dev dependencies such as Storybook, Vitest and ESLint never reach production, so their findings only mark the step red. `--audit-level=high` ignores low and moderate findings, which `npm audit` still shows locally.

Lint started with ESLint off in the two zones. Turning it on found one error and three warnings, and the project keeps 0 of both. The error was a `useEffect` that reset the page and the search when a filter changed, now done in the `onChange` handlers. The warnings were the `<img>` previews of attachments, which are data URLs that `next/image` does not optimize, so they carry a justified suppression.

The Storybook tests, `test:session-race` and `test:logout-scope` do not run in CI yet, because they need a browser or a running app. The Supabase contract suite stays out on purpose, since it needs a real project and its secret key.

## Dependabot

| Ecosystem | Schedule | Details |
|---|---|---|
| `npm` | weekly | One root lockfile for every workspace, at most 5 open PRs. Family groups first, then `minor-and-patch` |
| `github-actions` | weekly | Keeps `actions/checkout` and `actions/setup-node` current |

| Group | Patterns | Why together |
|---|---|---|
| `vitest` | `vitest`, `@vitest/*` | Released in lockstep, with `vitest` peers |
| `storybook` | `storybook`, `@storybook/*`, `eslint-plugin-storybook`, `@chromatic-com/storybook` | Same version across the family, with `storybook` peers |
| `next` | `next`, `eslint-config-next` | `eslint-config-next` must match Next.js, and both are pinned exactly |
| `minor-and-patch` | everything else | One PR instead of many |

The families exist because updating one package alone breaks `npm ci`: a PR that moved `@vitest/coverage-v8` to 5.x while `vitest` stayed on 4.x failed to install. Dependabot puts a dependency in the first group that matches, so the family groups come before the catch-all.

Major updates are paused during Phase 4, so that changes in tests, bundle size or Lighthouse come from the refactor and not from a tool:

```yaml
ignore:
  - dependency-name: "*"
    update-types: ["version-update:semver-major"]
```

Remove this rule after the delivery. The ignore rule also covers security updates, so a security fix that needs a major version would get no automatic PR. The blocking production audit still fails the pipeline in that case.

## Dependency audit

Before the refactor, `npm audit` found 24 vulnerable packages, 8 of them in production dependencies. None needed a major version to be fixed.

| Audit | Critical | High | Moderate | Low | Total |
|---|---|---|---|---|---|
| `npm audit`, before | 9 | 11 | 2 | 2 | 24 |
| `npm audit`, after | 0 | 0 | 0 | 0 | 0 |
| `npm audit --omit=dev`, before | 3 | 4 | 1 | 0 | 8 |
| `npm audit --omit=dev`, after | 0 | 0 | 0 | 0 | 0 |

Next.js 16.2.4 → 16.4.3 and next-auth 5.0.0-beta.31 → beta.32 fixed every production finding. The Storybook and Vitest families were raised within their majors, to `^10.6.2` and `^4.1.12`, and the lockfile fixed the rest.

Two advisories touched this app directly. Several proxy bypasses of Next.js (GHSA-26hh-7cqf-hhc6, GHSA-492v-c6pp-mqqv, GHSA-267c-6grr-h53f, GHSA-6gpp-xcg3-4w24) hit the proxy that guards `/dashboard` and `/transactions`. And GHSA-8fpg-xm3f-6cx3 in next-auth let an auth object filled with an error pass a check of `!!req.auth`, which was exactly the check of `apps/shell/src/proxy.ts`. The proxies now require `req.auth?.user`.

`eslint-config-next` 16.4.3 added `no-location-assign-relative-destination`, which flagged the four navigations between zones. They need a full page load, so each one carries a justified suppression. The release notes of Next.js 16.3 and 16.4 were checked for changes to routing, proxies and basePath, and a manual test of login, zones and logout passed.

## How to validate

1. On GitHub, open **Actions** → **CI**. Each run shows its commit, branch and status, and the `quality` job shows each step with its log.
2. On a pull request the result appears under **Checks**. To require it, add a branch rule for `main` with "Require status checks to pass" and select `quality`.
3. Dependabot PRs appear under **Pull requests**, and its logs under **Insights → Dependency graph → Dependabot**.
4. Locally, run the same commands: `npm ci`, `npx turbo lint`, `npm test`, `npx turbo build` and both audits.

On Windows, run `npm ci` with the dev servers stopped. A running `next dev` holds the native binary of lightningcss, and `npm ci` fails with `EPERM`.

## Known limits

- `next` is pinned exactly and `next-auth` is a pinned beta. A Next.js minor changes the Turbopack output, so check the build and a manual test before merging its update.
- The pause on major updates must be removed after the delivery.
