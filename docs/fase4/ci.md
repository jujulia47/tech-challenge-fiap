# Phase 4: continuous integration (Step 0.6)

**Date:** 2026-10-29

The repository now has a GitHub Actions pipeline (`.github/workflows/ci.yml`) and Dependabot (`.github/dependabot.yml`). Both take effect once they are pushed to GitHub.

## Pipeline: `CI`

**Triggers:** every `push` to `main` and every `pull_request` targeting `main`.

**Permissions:** `contents: read` at the workflow level. The job only needs to read the code. Following the principle of least privilege, the automatic `GITHUB_TOKEN` cannot push, comment, create releases or change issues, so a compromised step or dependency has nothing to abuse.

**Job `quality`** runs on `ubuntu-latest`. The steps run in order, and a failing step stops the job (except the last one).

| # | Step | Command | Why it exists |
|---|---|---|---|
| 1 | Checkout | `actions/checkout@v7` | Gets the commit being tested. |
| 2 | Setup Node (with npm cache) | `actions/setup-node@v7`, `node-version: 20`, `cache: npm` | Same Node major as the Dockerfiles (`node:20-alpine`), so CI matches production. The npm cache is keyed on `package-lock.json`, so unchanged dependencies are not downloaded again. |
| 3 | Install | `npm ci` | Clean install that follows `package-lock.json` exactly and fails if it is out of sync with `package.json`. This catches lockfile mistakes before deploy. |
| 4 | Lint | `npx turbo lint` | ESLint in all 8 workspaces (shell, dashboard, transactions, core, infrastructure, design-system, types, utils). The baseline is 0 errors and 0 warnings (steps 0.2 and 0.3). Note that warnings do not fail ESLint, only errors do. |
| 5 | Unit tests | `npm test` | Runs the Vitest unit tests (`packages/**/src/**/*.test.ts`, 441 tests today, including an integration test against a real json-server). Any change in pinned behavior during the refactor fails here. See `testing.md`. |
| 6 | Build | `npx turbo build` | Production build of the three Next.js apps, including TypeScript checks. Proves the code deploys. |
| 7 | Security audit (production) | `npm audit --omit=dev --audit-level=high` | **Blocking.** Fails if any production dependency has a known vulnerability of severity high or critical. |
| 8 | Security audit (full) | `npm audit --audit-level=high` + `continue-on-error: true` | **Informational.** Reports vulnerabilities in all dependencies, including dev tooling, without failing the pipeline. |

The action versions are the current majors, checked on 2026-10-29 against the GitHub releases API: `actions/checkout` latest is v7.0.1 and `actions/setup-node` latest is v7.1.0. Both `v7` major tags exist, and both actions run on `node24`. `setup-node@v7` still supports the `node-version` and `cache: npm` inputs. Every tool in the pipeline supports Node 20: the strictest is Vite/rolldown with `^20.19.0`, and `node-version: 20` resolves to the latest 20.x.

### Environment variables

The workflow sets **no environment variables and uses no secrets**. A build was run locally under CI-like conditions: `.env.local` not loaded (with `NODE_ENV=test`, Next.js skips `.env.local`) and the API pointed to a closed port, to simulate the missing json-server. It succeeded:

- `NEXTAUTH_SECRET` is only read when an auth request is handled. The auth route and `/dashboard/account` are dynamic (`ƒ`), so they do not run at build time.
- `NEXT_PUBLIC_API_URL`, `DASHBOARD_URL` and `TRANSACTIONS_URL` all have `localhost` fallbacks in code. The shell rewrites are disabled outside `next dev` and Docker.
- `/sobre` fetches the json-server at build time (ISR). Without the API, the fetch fails, the existing `try/catch` returns `total: 0`, and the page is generated without the "Em números" section. It is regenerated with real data after the first revalidation (`revalidate: 3600`) in the deployed app.

### Why the production audit blocks and the full audit does not

This is a DevSecOps trade-off between production risk and developer tooling.

- **Production dependencies** (`--omit=dev`) are code that ships in the Docker images and Vercel deployments and handles real requests: Next.js, NextAuth, React, sharp and their dependency trees. A high or critical vulnerability there is a direct risk to users, so it must stop the merge. Step 0.4 showed this is real: the Next.js and NextAuth advisories included middleware/proxy bypasses and an auth fail-open, which directly affect this app's only access control (`apps/shell/src/proxy.ts`).
- **Dev dependencies** (Storybook, Vitest, Vite, ESLint) never reach production. Their advisories usually need a running dev server or malicious local input. They still matter, but they should not block a production fix or a feature. When this step fails, the step is marked as failed in the log, but the job and the run still succeed (`continue-on-error`). That is the signal to schedule an update, which Dependabot usually opens on its own.
- `--audit-level=high` ignores low and moderate findings in both steps. Those are still visible by running `npm audit` locally.

Current state (step 0.4 and later): `npm audit` and `npm audit --omit=dev` both report 0 vulnerabilities, so both steps pass today.

## Dependabot

`.github/dependabot.yml` has two update configurations:

| Ecosystem | Directory | Schedule | Details |
|---|---|---|---|
| `npm` | `/` | weekly | One root `package-lock.json` covers all workspaces. `open-pull-requests-limit: 5`. Family groups `vitest`, `storybook` and `next`, then the catch-all group `minor-and-patch`. Major version updates are ignored during Phase 4 (see below). |
| `github-actions` | `/` | weekly | Keeps `actions/checkout` and `actions/setup-node` on current versions. `/` is the documented value; Dependabot looks in `.github/workflows`. |

### Family groups

Some packages are released in lockstep and must move together. If one of them is updated alone, its peer dependencies no longer match, and `npm ci` fails. This already happened: a Dependabot PR that bumped `@vitest/coverage-v8` to 5.x on its own broke `npm ci` with a peer dependency conflict, because `vitest` and the other `@vitest/*` packages were still on 4.x. Step 0.4 showed the same coupling for Storybook (`@storybook/addon-vitest` requires a matching `storybook` peer, and `@chromatic-com/storybook` declares a `storybook` peer range).

| Group | Patterns | Why together |
|---|---|---|
| `vitest` | `vitest`, `@vitest/*` | Versioned in lockstep, and the `@vitest/*` packages declare `vitest` peers |
| `storybook` | `storybook`, `@storybook/*`, `eslint-plugin-storybook`, `@chromatic-com/storybook` | Same version across the family, with `storybook` peers |
| `next` | `next`, `eslint-config-next` | `eslint-config-next` must match the Next.js version, and both are pinned to exact versions in the three apps |
| `minor-and-patch` | (all, `update-types: minor, patch`) | Everything else in one PR to reduce noise |

**Order matters.** The Dependabot docs state: "If a dependency matches more than one rule, it's included in the first group that it matches" ([options reference, `groups`](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference)), and "Dependabot creates groups in the order they appear in your `dependabot.yml` file" ([configuring security updates](https://docs.github.com/en/code-security/dependabot/dependabot-security-updates/configuring-dependabot-security-updates)). The family groups are declared before `minor-and-patch`, so a Vitest, Storybook or Next.js update always goes to its family PR and never into the catch-all PR. The family groups have no `update-types`, so they cover every update level that is not ignored.

These groups have no `applies-to`, so they apply to **version updates** only, which is the default ("When undefined, defaults to version updates"). Security update PRs are not grouped.

### Major updates paused during Phase 4

```yaml
ignore:
  - dependency-name: "*"
    update-types: ["version-update:semver-major"]
```

During the refactor, the toolchain should stay stable: the same majors of Next.js, React, Vitest, Storybook, ESLint and TypeScript as in the baselines. Then any change in tests, bundle size or Lighthouse comes from the refactor, not from a tool upgrade. The rule must be **removed after the Phase 4 delivery**, so that major updates resume.

**Effect on security updates: the rule is not limited to version updates.** The Dependabot docs say that ignore rules apply to both kinds of PR: "you can configure Dependabot to ignore those dependencies when it opens pull requests for version updates and security updates" ([controlling dependencies updated](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/manage-your-dependency-security/controlling-dependencies-updated)). The exception "`update-types` only affects *version* updates, not *security* updates" appears only for `allow`, not for `ignore`. The docs do not explicitly describe a security fix that needs a major bump. The safe reading is that **such a fix would not get an automatic PR while this rule is active.** Fixes that do not need a major bump are not affected.

Mitigation: the blocking "Security audit (production)" step in CI fails on any high or critical production vulnerability, whether or not Dependabot opens a PR. A security fix that needs a major bump therefore still turns the pipeline red and has to be handled manually.

Notes:

- Dependabot **security updates** (PRs for known vulnerabilities, outside the weekly schedule) are a repository setting: Settings → Code security → Dependabot security updates. They are not part of this file, but the `ignore` rule above applies to them.
- Every Dependabot PR runs the `CI` workflow, so an update that breaks lint, tests, build or the production audit shows up as a failing check before merge.
- Things to watch on grouped PRs: `next` and `eslint-config-next` are pinned to exact versions (`16.4.3`) in the three apps, and `next-auth` to `5.0.0-beta.32`. Dependabot proposes those bumps by editing the pins. Next.js minor updates change Turbopack output, so check the build and a manual smoke test before merging (see `dependency-audit.md`).

## Seeing the results on GitHub

1. Open the repository on GitHub and go to the **Actions** tab.
2. Select the **CI** workflow on the left. Each run is listed with its commit or PR, branch and status (✓ passed, ✗ failed, ● running).
3. Open a run and the `quality` job to see each step and its logs. A failed step is expanded automatically. If the informational "Security audit (full)" step fails, it is shown as failed, but the job and the run are still green.
4. On pull requests, the result also appears in the **Checks** section at the bottom of the PR. To require it before merging, enable a branch protection rule (or ruleset) for `main` with "Require status checks to pass" and select `quality`.
5. Dependabot PRs appear in the **Pull requests** tab, and Dependabot's own logs are under **Insights → Dependency graph → Dependabot**.

## Local validation (2026-10-29)

The commands from steps 3 to 8 were run at the repository root, in order:

| Step | Command | Result |
|---|---|---|
| 3 | `npm ci` | ❌ Locally: `EPERM: operation not permitted, unlink ...lightningcss.win32-x64-msvc.node`. The local `next dev` servers (`npm run dev`) had the native binary loaded, and Windows does not allow deleting a file in use. The tree was restored with `npm install`. This is a local-machine condition: on the CI runner nothing else is running. Run `npm ci` locally only with the dev servers stopped. |
| 4 | `npx turbo lint` | ✅ exit 0, 6 of 6 tasks |
| 5 | `npm test` | ✅ exit 0, 30 files, 441 tests passed (updated in step 1.4b) |
| 6 | `npx turbo build` | ✅ exit 0, 3 of 3 apps (Next.js 16.4.3) |
| 7 | `npm audit --omit=dev --audit-level=high` | ✅ exit 0, found 0 vulnerabilities |
| 8 | `npm audit --audit-level=high` | ✅ exit 0, found 0 vulnerabilities |

Both YAML files were parsed with `js-yaml` 4.3.2 (already installed) without errors. GitHub only runs the pipeline after the push, so the first run on GitHub is the real end-to-end check.
