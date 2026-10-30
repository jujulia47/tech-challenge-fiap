# ADR 0003: English transaction type codes

**Status:** Accepted (2026-10-30)

## Context

Transaction types are stored today as Portuguese display labels (`"Depósito"`, `"Câmbio de Moeda"`), so the persisted value and the UI text are the same string. Changing a label would change the data. The project rule is English in code and Portuguese in user-visible text. The code also had no notion of direction: nothing said which types add to or subtract from the balance.

## Decision

The domain uses stable English codes, mapped 1:1 to the seven current types, and each code has a fixed direction:

| Label | Code | Direction | Assumption |
|---|---|---|---|
| Depósito | `deposit` | income | Obvious |
| Empréstimo e Financiamento | `loan` | income | The amount received, not an installment paid |
| Saque | `withdrawal` | expense | Obvious |
| Pagamento | `payment` | expense | Obvious |
| Transferência | `transfer` | expense | A transfer sent |
| DOC/TED | `doc_ted` | expense | A transfer sent |
| Câmbio de Moeda | `currency_exchange` | expense | A purchase of foreign currency, because only a BRL account exists |

The core has no Portuguese labels. `transactionDirection(type)` is the single source of the rule, and `Transaction.amount` is always the positive magnitude. The sign comes from `signedAmount()`.

## Consequences

- Labels can change or be translated without touching stored data. The presentation layer owns the code-to-label mapping.
- Stored records must be migrated from labels to codes.
- The direction rule is new, not extracted from existing code. With the current data it gives a calculated balance of R$ 1.150,00, replacing the fixed R$ 2.500,00 shown today. This change is intentional.
- **Known limitation:** a type has one direction, so the model does not distinguish a transfer sent from one received. The same goes for `doc_ted`, selling foreign currency and paying a loan installment. A possible evolution is adding types such as `transfer_received`, or storing the direction on the transaction.
