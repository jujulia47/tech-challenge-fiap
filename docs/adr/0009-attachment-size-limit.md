# ADR 0009: Attachment size limit

**Status:** Accepted (2026-10-30)

## Context

The form limited attachments to 100 KB, and step 2.1 copied that number to the BFF. Attachments travel inside the JSON body as base64 data URLs, and base64 makes a file about a third larger.

json-server reads bodies with `milliparsec`, whose default limit is 102400 bytes for the whole body, and its command line has no option to change that. On the installed version (1.0.0-beta.15), the largest attachment that got through was 76 707 bytes. At 76 708 bytes, json-server answered 500, `Payload too large`.

So a file between about 76 KB and 100 KB passed the validation, in the form and in the BFF, and then failed in the backend. The user was told that the file was acceptable and got a server error.

## Decision

The limit is **70 KB (71 680 bytes) of decoded file**, everywhere.

- **Why 70 and not 76.** A 70 KB attachment takes 95 604 bytes as a data URL. With the largest values in every other field, the body is 95 758 bytes, which leaves 6 642 bytes of margin. A limit at the measured edge would leave none, and the next field added to a transaction would bring the bug back.
- **One definition.** `MAX_ATTACHMENT_BYTES` lives in `packages/bff/src/http/limits.ts` and is exported as `@bytebank/bff/limits`. The file has no imports, so a client component can use it without pulling server code into the browser bundle. It is not in the main entry of the package, which is server code.
- **Not in `@bytebank/core`.** The number comes from the current backend, not from a business rule.
- **The form follows in two steps.** It changes to 70 KB now, with the number written directly, and it starts importing the constant in step 2.2.
- **The body limit stays at 200 KB.** It only exists to refuse abuse before parsing, and it is independent of this number.

## Consequences

- The bug is gone. The end-to-end test sends an attachment at the limit, with the largest values in the other fields, through POST and PATCH, to a real json-server.
- The reason is recorded in a test: another test sends 80 KB straight to json-server and expects the refusal. If an upgrade changes that limit, the test fails, and this decision can be reviewed.
- Files between 70 KB and about 76 KB, which used to work, are now refused. No stored transaction has an attachment today.
- An attachment that is already stored is not validated again: a PATCH only checks the attachment when it is in the body.
- Until step 2.2, the number exists in two places, the constant and the form. Since step 2.2, the form imports the constant.
- The limit was measured on 1.0.0-beta.15, the version of the repository. Since step 2.3, Docker Compose runs that version too (see `infrastructure.md`).
- **The limit belongs to the backend, so it will be reviewed in Block 3.** With Firestore, the limit becomes the size of a document. With encryption, the stored value grows beyond the base64 size, which reduces the room for the file. Either change can move this number in both directions.
