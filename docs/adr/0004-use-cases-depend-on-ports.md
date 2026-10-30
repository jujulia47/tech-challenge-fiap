# ADR 0004: Use cases depend on ports

**Status:** Accepted (2026-10-30)

## Context

Today the apps call the json-server directly with `fetch`, from `lib/api/transactions.ts` in each zone, and the rules live in components (the future-date check in `CardNewTransaction`, for example). Rules cannot be tested without a UI, and changing the backend means changing every caller. The use cases also need things that the domain must not know about: storage, the current date and id generation.

## Decision

Apply dependency inversion. The application layer defines the interfaces it needs (ports), and outer layers implement them:

- `TransactionRepository`: always scoped to a user.
- `Clock`: `today()` returns a `CalendarDate`.
- `IdGenerator`: `next()` returns a string.

Use cases are classes that receive ports through the constructor and expose one `execute` method. They take and return DTOs made of primitives, so the presentation layer never touches entities.

Dependencies point inward: presentation and infrastructure depend on the application, the application depends on the domain, and the domain depends on nothing. The core keeps zero runtime dependencies.

## Consequences

- **The backend can change without touching the domain or the use cases.** Moving from json-server to Firestore or Supabase means writing a new class that implements `TransactionRepository` and wiring it where the use cases are created. `Transaction`, `Money` and the use cases do not change.
- Use cases are tested with `InMemoryTransactionRepository`, a fixed clock and a deterministic id generator: no network, no real time, and fast tests. Time-dependent rules become deterministic.
- Ownership becomes part of the contract: `findById` and `delete` require a `userId`, so a new adapter cannot forget the parameter. An adapter must still enforce it in its queries, and the core cannot check that. Real isolation also needs server-side rules (such as Firestore rules or Supabase RLS), because a port running in the browser is not a security boundary.
- More code than a direct `fetch`: each app needs adapters and a place to build the use cases (composition root), and data must be converted between storage and primitives.
- `Clock` adapters must pick the reference timezone (`America/Sao_Paulo`) when building today's date.
