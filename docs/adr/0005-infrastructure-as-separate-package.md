# ADR 0005: Infrastructure as a separate package

**Status:** Accepted (2026-10-30)

## Context

ADR 0004 made the use cases depend on ports. Something must implement them: the HTTP calls to json-server, the clock and the id generator. Today this code lives in `lib/api/transactions.ts`, duplicated in each zone. The adapters could go inside `@bytebank/core`, or inside each app.

## Decision

The adapters live in their own package, `@bytebank/infrastructure`.

- Dependencies point to the core: `infrastructure → core`. The core never imports the infrastructure, and its zero-dependency rule stays intact.
- The package depends only on `@bytebank/core` and uses native `fetch`, `Intl` and `crypto`.
- Configuration is injected: `HttpTransactionRepository` receives `baseUrl` through its constructor and never reads `process.env`.
- The json-server specifics stay in `json-server/`, including the record format and the behaviors that had to be worked around (`_where` for string ids, the id replaced on `POST`).

## Consequences

- **Changing the backend does not touch the domain or the use cases.** Moving to Firestore or Supabase means adding a new adapter (or package) that implements `TransactionRepository`, and changing the place where it is built.
- Both zones share one implementation instead of two copies.
- The adapters are tested on their own, without an app.
- Each new workspace needs a `COPY` line in the three Dockerfiles, so that `npm ci` sees the same workspaces as the lockfile.
- The port had to adapt to a real backend: `create` now returns the stored transaction, because json-server assigns its own id. Other backends can return the same transaction they received.
- Running in the browser means that `baseUrl` is public and ownership checks in the adapter are not a security boundary. This remains a mock backend (see ADR 0004).
