# Continuous integration and dependencies

The repository has a GitHub Actions pipeline (`.github/workflows/ci.yml`) and Dependabot (`.github/dependabot.yml`). Every push and pull request to `main` runs lint, tests, build and two dependency audits.

## Pipeline: `CI`

**Triggers:** every `push` to `main` and every `pull_request` targeting `main`.

**Permissions:** `contents: read` at the workflow level. The job only reads the code, so the automatic `GITHUB_TOKEN` cannot push, comment, create releases or change issues, and a compromised step or dependency has nothing to abuse.

**Job `quality`**, on `ubuntu-latest`. The steps run in order, and a failing step stops the job, except the last one.

| # | Step | Command | Why |
|---|---|---|---|
| 1 | Checkout | `actions/checkout@v7` | The commit being tested |
| 2 | Setup Node, with npm cache | `actions/setup-node@v7`, `node-version: 22`, `cache: npm` | Same major as the Dockerfiles (`node:22-alpine`); json-server 1.0.0-beta.15 requires Node >= 22.12. The cache is keyed on `package-lock.json` |
| 3 | Install | `npm ci` | Follows the lockfile exactly and fails if it is out of sync with `package.json` |
| 4 | Lint | `npx turbo lint` | ESLint in the 3 apps and the 7 packages, including the layer rules. Warnings do not fail ESLint, only errors; the project keeps 0 of both |
| 5 | Unit tests | `npm test` | The unit, integration and contract tests of the packages ([testing.md](testing.md)), including tests against a real json-server |
| 6 | Build | `npx turbo build` | Production build of the three apps, with the TypeScript check |
| 7 | Security audit (production) | `npm audit --omit=dev --audit-level=high` | **Blocking.** Fails on any high or critical vulnerability in a production dependency |
| 8 | Security audit (full) | `npm audit --audit-level=high`, `continue-on-error: true` | **Informational.** Reports dev tooling too, without failing the run |

**No secrets.** The workflow sets no environment variable and uses no secret. The build never reads runtime variables: the handlers and the adapters are made on the first request, every page is rendered per request, and the zone hosts are only required on Vercel. A build was run under CI-like conditions (no `.env.local`, with `NODE_ENV=test`, and the database on a closed port) and succeeded.

**Not in the CI yet:** the Storybook tests and the session race test, which need a browser and a running app ([security.md](security.md#next-phase)). The Supabase contract suite stays out on purpose: it needs a real project and its secret key.

### Why the production audit blocks and the full audit does not

- **Production dependencies** (`--omit=dev`) ship in the Docker images and the Vercel deployments and handle real requests: Next.js, NextAuth, React, sharp and their trees. A high or critical vulnerability there is a direct risk to users, so it must stop the merge. The audit below showed this is real: the Next.js and NextAuth advisories included proxy bypasses and an auth fail-open, which hit this app's only access control.
- **Dev dependencies** (Storybook, Vitest, Vite, ESLint) never reach production. Their advisories usually need a running dev server or malicious local input. A failure marks the step red while the job stays green, which is the signal to schedule an update; Dependabot usually opens it.
- `--audit-level=high` ignores low and moderate findings in both steps; `npm audit` locally still shows them.

The action versions were checked on 2026-10-29 against the GitHub releases API: `actions/checkout` v7.0.1 and `actions/setup-node` v7.1.0, both on `node24`, with the `node-version` and `cache: npm` inputs still supported.

## Dependabot

| Ecosystem | Directory | Schedule | Details |
|---|---|---|---|
| `npm` | `/` | weekly | One root lockfile for every workspace. `open-pull-requests-limit: 5`. Family groups `vitest`, `storybook` and `next`, then the catch-all `minor-and-patch`. Major updates ignored during Phase 4 |
| `github-actions` | `/` | weekly | Keeps `actions/checkout` and `actions/setup-node` current. `/` is the documented value; Dependabot looks in `.github/workflows` |

### Family groups

Some packages are released in lockstep and must move together, or their peer dependencies stop matching and `npm ci` fails. It happened: a Dependabot PR that moved `@vitest/coverage-v8` alone to 5.x broke `npm ci`, because `vitest` was still on 4.x.

| Group | Patterns | Why together |
|---|---|---|
| `vitest` | `vitest`, `@vitest/*` | Versioned in lockstep, with `vitest` peers |
| `storybook` | `storybook`, `@storybook/*`, `eslint-plugin-storybook`, `@chromatic-com/storybook` | Same version across the family, with `storybook` peers |
| `next` | `next`, `eslint-config-next` | `eslint-config-next` must match Next.js, and both are pinned exactly in the three apps |
| `minor-and-patch` | everything else, `update-types: minor, patch` | One PR, less noise |

**Order matters.** The Dependabot docs say that "If a dependency matches more than one rule, it's included in the first group that it matches" ([options reference](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference)), and that groups are created in the order of the file ([configuring security updates](https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/configuring-dependabot-security-updates)). The family groups come first, so their updates never land in the catch-all. The groups have no `applies-to`, so they cover version updates only; security PRs are not grouped.

### Major updates paused during Phase 4

```yaml
ignore:
  - dependency-name: "*"
    update-types: ["version-update:semver-major"]
```

During the refactor the toolchain stayed on the majors of the baselines, so that a change in tests, bundle size or Lighthouse came from the refactor and not from a tool. **This rule must be removed after the Phase 4 delivery.**

The docs say that ignore rules apply to version and security updates alike ([controlling dependencies updated](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/controlling-dependencies-updated)); the exception "`update-types` only affects version updates" is documented for `allow`, not for `ignore`. So a security fix that needs a major bump would get no automatic PR while the rule is active. The blocking production audit still turns the pipeline red in that case. Dependabot security updates themselves are a repository setting (Settings → Code security), outside this file.

## Dependency audit

Before the refactor, `npm audit` was run at the root and every finding classified by exposure: **runtime-app** (runs in the deployed apps), **runtime-mock** (only json-server: none), **dev-only** (tooling), and **dev-only (build)** (production dependencies of `next` or the Tailwind PostCSS plugin that only process CSS and browser targets at build time).

| Audit | Critical | High | Moderate | Low | Total |
|---|---|---|---|---|---|
| `npm audit`, before | 9 | 11 | 2 | 2 | 24 |
| after the runtime update and `npm audit fix` | 6 | 0 | 1 | 1 | 8 |
| after the Storybook and Vitest update | 0 | 0 | 0 | 0 | **0** |
| `npm audit --omit=dev`, before | 3 | 4 | 1 | 0 | 8 |
| `npm audit --omit=dev`, after | 0 | 0 | 0 | 0 | **0** |

Counts are per package, as npm reports them; a package carries its highest severity, inherited ones included. No fix needed a major version, and none was missing.

| Package | Version | Severity | Exposure | Fixed by |
|---|---|---|---|---|
| `next` | 16.2.4 | critical (33 advisories, plus inherited `postcss` and `sharp`) | runtime-app | `next` 16.4.3 |
| `next-auth`, `@auth/core` | 5.0.0-beta.31, 0.41.2 | critical | runtime-app | `next-auth` 5.0.0-beta.32 (`@auth/core` 0.41.3) |
| `sharp` | 0.34.5 | high | runtime-app (image optimizer) | `next` 16.4.3 (0.35.5) |
| `postcss`, `nanoid`, `source-map-js`, `baseline-browser-mapping` | | high to moderate | dev-only (build) | `next` 16.4.3 and the lockfile |
| `storybook`, `@storybook/addon-vitest`, `vitest`, `@vitest/browser`, `@vitest/browser-playwright`, `@vitest/coverage-v8`, `@vitest/mocker` | 10.3.6, 4.1.5 | critical | dev-only | Ranges raised to `^10.6.2` and `^4.1.12` (installed 10.6.5 and 4.1.12); `@chromatic-com/storybook` to `^5.2.1` |
| `vite`, `esbuild`, `ws`, `image-size` | 8.0.10, 0.27.7, 8.20.0, 2.0.2 | high to low | dev-only | Lockfile (8.3.5, 0.28.2, 8.22.0, 2.0.4) |
| `brace-expansion`, `browserslist`, `js-yaml`, `zod`, `@babel/core` | | high to low | dev-only (lint) | Lockfile |

**The advisories that mattered here:**

- **Proxy bypasses in Next.js** (GHSA-26hh-7cqf-hhc6, GHSA-492v-c6pp-mqqv, GHSA-267c-6grr-h53f, GHSA-6gpp-xcg3-4w24, the last one for App Router apps built with Turbopack, which is this setup). The shell proxy was the only guard of `/dashboard` and `/transactions`.
- **Auth fail-open in next-auth** (GHSA-8fpg-xm3f-6cx3, critical): configuration errors fill the `auth` object with an error, so checks that only test whether it exists fail open. `apps/shell/src/proxy.ts` used exactly `!!req.auth`; it now requires `!!req.auth?.user`, as the zone proxies do.
- **The critical RCEs of Next.js** targeted the Image Optimization API, `next/og`, `use cache` and Windows-hosted servers. The apps use none of them and run on Linux, which lowered the likelihood; the update removed the exposure.
- **Dev-only critical advisories** (code injection into the Storybook dev server, RCE through the Vitest browser API) only matter while those servers run on a developer machine. They were fixed anyway, since no major bump was needed.

**What else had to be handled:**

- `npm audit fix` does not move the Storybook and Vitest families together, so their ranges were raised by hand to the lowest fixed versions. `@chromatic-com/storybook` 5.1.2 kept an old `storybook@10.3.6` hoisted for its peer range; 5.2.1 is the first that accepts 10.6.
- After the incremental updates, `storybook build` failed with `SB_CORE-SERVER_0002 (CriticalPresetLoadError)`: `storybook` was hoisted to the root while `@storybook/nextjs-vite` was nested in the shell, and `npm dedupe` did not move them. Removing only those lockfile entries and installing again placed them all at the root, with no version change.
- `eslint-config-next` 16.4.3 added `no-location-assign-relative-destination`, which flagged the four cross-zone navigations (login → `/dashboard`, logout → `/`). A full page load is required there, so each line got a justified suppression. An absolute URL had hidden them from the rule without the rule allowing them, and was reverted.
- The release notes of Next.js 16.3 and 16.4 were read for what touches this setup: strict route matching by default, proxy matcher fixes under Turbopack, basePath in redirects, the build cache on by default, changed chunk hashing (so the bundle baseline was measured again, [baseline.md](baseline.md)). The smoke test of login, zones, account and logout passed, and the route tables did not change.

## How to validate

1. Open the repository on GitHub → **Actions** → **CI**. Each run shows its commit, branch and status; the `quality` job shows each step and its log. If only the informational audit fails, the step is red and the run green.
2. On a pull request, the result appears in the **Checks** section. To require it, add a branch protection rule (or ruleset) for `main` with "Require status checks to pass" and select `quality`.
3. Dependabot PRs appear under **Pull requests**; its logs are under **Insights → Dependency graph → Dependabot**.
4. Locally, the same steps: `npm ci`, `npx turbo lint`, `npm test`, `npx turbo build`, `npm audit --omit=dev --audit-level=high` and `npm audit --audit-level=high`.

**On Windows, run `npm ci` with the dev servers stopped.** A running `next dev` holds the native binary of lightningcss, and `npm ci` fails with `EPERM: operation not permitted, unlink ...lightningcss.win32-x64-msvc.node`. The CI runner has nothing else running.

## Known limits

- `next-auth` is a beta pinned to `5.0.0-beta.32`, and `next` is pinned exactly. Dependabot proposes their bumps by editing the pins; a Next.js minor changes the Turbopack output, so check the build and a smoke test before merging.
- The major-update pause must be removed after the delivery (above).
