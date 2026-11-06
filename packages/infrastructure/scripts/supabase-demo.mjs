// The demonstration data in Supabase, from apps/shell/data/db.seed.json.
//   npm run db:seed:supabase    creates what is missing, and can run twice
//   npm run db:clean:supabase   deletes the demonstration users and all that belongs to them
//   npm run db:reset:supabase   deletes everything, then seeds: only the demonstration is left
// Reads SUPABASE_URL and SUPABASE_SECRET_KEY from the .env of the root. Prints counts, never data.
import { readFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const SEED = JSON.parse(readFileSync(new URL('../../../apps/shell/data/db.seed.json', import.meta.url), 'utf8'))
const TABLES = ['rate_limits', 'password_reset_tokens', 'transactions', 'users']
const KEY_COLUMN = { rate_limits: 'key' }

function database() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SECRET_KEY
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY must be set (run through npm, which reads .env)')
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
}

// No message from Postgres: it can quote the values of a row. The status is checked too,
// because a HEAD request (the counts) has no body, so a missing table brings no error object.
function check(operation, { error, status }) {
  if (error || status >= 400) throw new Error(`${operation} failed (status ${status}${error?.code ? `, code ${error.code}` : ''})`)
}

async function count(db, table) {
  const result = await db.from(table).select('*', { count: 'exact', head: true })
  check(`count ${table}`, result)
  return result.count
}

async function seed(db) {
  const users = SEED.users.map(({ id, name, email, passwordHash }) => ({ id, name, email, password_hash: passwordHash }))
  const transactions = SEED.transactions.map(({ id, userId, type, amountInCents, date, attachment }) => ({
    id,
    user_id: userId,
    type,
    amount_in_cents: amountInCents,
    date,
    attachment: attachment ?? null,
  }))
  // ON CONFLICT (id) DO NOTHING: a second run adds nothing and changes nothing
  check('seed users', await db.from('users').upsert(users, { onConflict: 'id', ignoreDuplicates: true }))
  check('seed transactions', await db.from('transactions').upsert(transactions, { onConflict: 'id', ignoreDuplicates: true }))
}

async function clean(db) {
  // The transactions and the tokens go with their users (on delete cascade)
  check('delete demonstration users', await db.from('users').delete().in('id', SEED.users.map(user => user.id)))
}

async function wipe(db) {
  for (const table of TABLES) check(`empty ${table}`, await db.from(table).delete().neq(KEY_COLUMN[table] ?? 'id', ''))
}

const COMMANDS = { seed, clean, reset: async db => { await wipe(db); await seed(db) } }

async function main() {
  const command = process.argv[2]
  if (!COMMANDS[command]) throw new Error('Usage: supabase-demo.mjs seed | clean | reset')
  const db = database()
  await COMMANDS[command](db)
  const counts = []
  for (const table of TABLES) counts.push(`${table} ${await count(db, table)}`)
  console.log(`${command}: done. ${counts.join(', ')}`)
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
