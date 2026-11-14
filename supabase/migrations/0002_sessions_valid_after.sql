-- Revocation of sessions on the server (docs/fase4/security.md, "Ending every session").
-- A logout or a new password records the moment here; the three apps refuse a session that
-- started before it. Null: the user never ended their sessions.
-- Run once in the SQL Editor of the project, after 0001_init.sql. It changes no grant: the table
-- keeps RLS on with no policy, and only the secret key of the server reaches it.

alter table public.users add column if not exists sessions_valid_after timestamptz;
