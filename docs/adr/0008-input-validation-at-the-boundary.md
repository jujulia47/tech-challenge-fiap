# ADR 0008: Input validation at the boundary

**Status:** Accepted (2026-10-30)

## Context

The domain already rejects invalid data: `Transaction`, `Money` and `CalendarDate` throw `DomainError`. Moving every check to the HTTP layer would make the domain depend on its callers, and the migration and the repository would lose those guarantees. Relying only on the domain would leave gaps, because it receives typed values and knows nothing about HTTP:

- A body with extra fields, such as `userId`, is not a domain error. It would simply be ignored or, worse, used.
- A wrong JSON type (`"100"` instead of `100`) reaches the domain as a value that TypeScript claims is a number.
- The limits on attachments concern what the application accepts over the network. The entity treats an attachment as an opaque string, on purpose.

## Decision

There are two layers, with different roles.

| | Boundary (Zod, `packages/bff/src/http/schemas.ts`) | Domain (`packages/core`) |
|---|---|---|
| Question | Is this request well formed? | Is this allowed by the business rules? |
| Examples | JSON shape, field types, unknown fields, `YYYY-MM-DD` format, allowed MIME types, size limits | The date exists, the date is not in the future, the amount is positive, the type is known |
| Failure | 400 `VALIDATION_ERROR`, with field and message | 422 with the error code |
| Runs for | HTTP requests only | Every path, including the migration and stored data |

- **Schemas are strict.** Unknown fields are rejected, not stripped. `userId` in the body is an error, so a client cannot believe that it chose the owner.
- **Some rules exist in both layers on purpose.** The amount must be a positive integer in both. The boundary gives the client a better error, and the domain remains the guarantee on every other path.
- **The date format is checked at the boundary and its existence in the domain.** `2026-02-31` passes the schema and gets a 422 from `CalendarDate`. Zod's `z.iso.date()` also checks existence, so it is not used: the rule would live in two places, with two different responses.
- **Error messages are fixed strings.** Zod's default messages can repeat what was received, such as the name of an unknown key. Issues contain only the field and the message.

## Consequences

- The domain stays free of dependencies: only `@bytebank/bff` depends on Zod.
- A rule that belongs to the business is added to the domain, and it then holds on every path. A rule about what the API accepts is added to the schema.
- Clients can tell the two kinds of failure apart: a 400 points at a field, and a 422 carries a stable code that the interface can translate.
- A new field must be added to the schema, or the API rejects it. This is the intended cost of strict schemas.
- Zod becomes a production dependency. It was already installed, as an indirect development dependency, at the same version.
