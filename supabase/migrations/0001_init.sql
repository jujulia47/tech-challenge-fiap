-- Bytebank: the production database (step D1). Run once, in the SQL Editor of the project.
-- Supabase is only the database: the login is ours, so nothing here uses Supabase Auth.
-- Every table has RLS on and no policy, and the anon and authenticated roles have no grant:
-- only the secret key, on the server, reaches the data. See docs/fase4/deploy.md.

begin;

-- ── Users ─────────────────────────────────────────────────────────────────────
-- Ids are text: the domain makes them (CryptoIdGenerator), and the seed uses "1" and "2"
create table public.users (
  id text primary key check (id <> ''),
  -- Same limit as the domain (User, USER_NAME_MAX_LENGTH): 1 to 100 characters, not only spaces
  name text not null check (char_length(btrim(name)) between 1 and 100),
  -- The domain stores it trimmed and in lower case; the index below makes it unique in any case
  email text not null check (email = lower(btrim(email)) and email like '%_@_%._%'),
  password_hash text not null check (password_hash <> ''),
  created_at timestamptz not null default now()
);

create unique index users_email_unique on public.users (lower(email));

-- ── Transactions ──────────────────────────────────────────────────────────────
create table public.transactions (
  id text primary key check (id <> ''),
  user_id text not null references public.users (id) on delete cascade,
  type text not null check (
    type in ('deposit', 'withdrawal', 'transfer', 'payment', 'currency_exchange', 'doc_ted', 'loan')
  ),
  amount_in_cents bigint not null check (amount_in_cents > 0 and amount_in_cents <= 9007199254740991),
  date date not null,
  -- Encrypted with AES-256-GCM by the server before it gets here (EncryptedAttachmentRepository)
  attachment text,
  created_at timestamptz not null default now()
);

-- The statement, the balance and the charts all read the transactions of one user, by date
create index transactions_user_date on public.transactions (user_id, date desc);

-- ── Password reset tokens ─────────────────────────────────────────────────────
-- Only the hash of the token: a copy of the database gives no working link
create table public.password_reset_tokens (
  id text primary key default gen_random_uuid()::text,
  user_id text not null references public.users (id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index password_reset_tokens_open on public.password_reset_tokens (user_id) where used_at is null;

-- ── Rate limits ───────────────────────────────────────────────────────────────
-- One counter per key and window. The key is a SHA-256 made by the server, so no email
-- or IP is stored here.
create table public.rate_limits (
  key text primary key check (key ~ '^[0-9a-f]{64}$'),
  window_start timestamptz not null,
  hits integer not null check (hits >= 0)
);

-- ── Atomic functions ──────────────────────────────────────────────────────────

-- Claims a reset token. Only one call can claim it: the update is a single statement,
-- so a second call, even at the same time, finds used_at already set and gets false.
create function public.use_password_reset_token(p_id text)
returns boolean
language sql
set search_path = ''
as $$
  with claimed as (
    update public.password_reset_tokens
       set used_at = now()
     where id = p_id
       and used_at is null
    returning 1
  )
  select exists (select 1 from claimed);
$$;

-- Counts one attempt and answers whether it may go on, with the time left when it may not.
-- The row is locked while it is read and written, so parallel attempts are counted one by one.
-- A refused attempt is not counted, as in the in-memory limiter.
create function public.consume_rate_limit(p_key text, p_max_hits integer, p_window_ms integer)
returns table (allowed boolean, retry_after_ms integer)
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_window interval := make_interval(secs => p_window_ms / 1000.0);
  v_row public.rate_limits%rowtype;
begin
  insert into public.rate_limits (key, window_start, hits)
  values (p_key, v_now, 0)
  on conflict (key) do nothing;

  select * into v_row from public.rate_limits where key = p_key for update;

  if v_row.window_start + v_window <= v_now then
    update public.rate_limits set window_start = v_now, hits = 1 where key = p_key;
    return query select true, 0;
  elsif v_row.hits < p_max_hits then
    update public.rate_limits set hits = hits + 1 where key = p_key;
    return query select true, 0;
  else
    return query select false, ceil(extract(epoch from (v_row.window_start + v_window - v_now)) * 1000)::integer;
  end if;
end;
$$;

-- Gives back the last attempt, when it turned out not to be a failure
create function public.release_rate_limit(p_key text)
returns void
language sql
set search_path = ''
as $$
  update public.rate_limits set hits = greatest(hits - 1, 0) where key = p_key;
$$;

-- ── Access: the secret key only ───────────────────────────────────────────────
-- RLS on with no policy denies every row to the roles that RLS applies to (anon, authenticated).
-- The secret key uses service_role, which bypasses RLS. The revokes remove the grants that
-- Supabase gives to new tables by default, so the publishable key cannot even read the schema.
alter table public.users enable row level security;
alter table public.transactions enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.rate_limits enable row level security;

revoke all on table public.users, public.transactions, public.password_reset_tokens, public.rate_limits
  from anon, authenticated;
grant all on table public.users, public.transactions, public.password_reset_tokens, public.rate_limits
  to service_role;

revoke all on function public.use_password_reset_token(text) from public, anon, authenticated;
revoke all on function public.consume_rate_limit(text, integer, integer) from public, anon, authenticated;
revoke all on function public.release_rate_limit(text) from public, anon, authenticated;
grant execute on function public.use_password_reset_token(text) to service_role;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
grant execute on function public.release_rate_limit(text) to service_role;

commit;
