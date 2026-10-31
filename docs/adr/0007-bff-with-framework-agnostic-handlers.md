# ADR 0007: BFF with framework-agnostic handlers

**Status:** Accepted (2026-10-30)

## Context

Today the browser calls json-server directly, and the `baseUrl` is public (see ADR 0005). The `userId` could be anything the client sends, and the ownership checks in the adapter run in the browser, so they protect nothing. Both zones need the same operations, and each has its own state layer: Redux in the dashboard and Context in the transactions zone.

The zones need a server-side layer between the browser and the data, and the session must be the only source of the user. That layer could be written directly as Next.js route handlers, once per zone.

## Decision

The HTTP layer lives in its own package, `@bytebank/bff`, and is written against the standard `Request` and `Response` types of the Web API.

- `createTransactionHandlers({ getUserId, useCases, allowedOrigins, logger? })` returns one function per operation. Each one takes a `Request` and returns a `Response`.
- The package does not depend on Next.js or NextAuth. Its dependencies are `@bytebank/core`, `@bytebank/infrastructure` and `zod`.
- `getUserId: (request: Request) => Promise<string | null>` is injected. The zone decides how to read the session, and the handler only knows the result.
- The handler for a route is the same in both zones. A route file only connects the HTTP method to a handler.
- Composition is separate from the handlers: `createUseCases` receives the ports, and `createJsonServerUseCases` builds them for the current backend.

## Consequences

- **Testable without Next.js.** The tests call the handlers with real `Request` objects and an in-memory repository, with no server, no session and no framework mocks.
- **Reused by both zones.** Validation, error translation and the security rules exist once, instead of in two copies that can drift apart, as `lib/api/transactions.ts` did.
- **Ready for RTK Query in Block 4.** The handlers offer a plain HTTP contract with JSON bodies and stable error codes, so a client state library only needs a base URL. The response bodies are core DTOs, so the types can be shared.
- **Changing the backend changes one function.** A new `createXUseCases` replaces `createJsonServerUseCases`. The handlers do not change.
- **Changing the framework keeps the rules.** Any runtime with `Request` and `Response` can call the handlers. Only `getUserId` and the route files are specific to Next.js.
- `getUserId` gets the `Request`, even though NextAuth's `auth()` reads the session on its own, so that other session strategies work without changing the contract.
- There is one more layer to go through, and every call makes a server-side round trip. That is the cost of having a boundary at all.
- Each zone still has to add the route files and list the packages in `transpilePackages`. That is step 2.2.
