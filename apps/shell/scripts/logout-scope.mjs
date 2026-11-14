#!/usr/bin/env node
// What each logout ends (docs/fase4/security.md, "Ending every session"): the inactivity logout
// ends the session of its own browser only, and "Sair" of the menu ends the sessions of every
// browser of the user. Needs a running app with short idle times, and Chrome:
//   IDLE_TIMEOUT_SECONDS=20 IDLE_WARNING_SECONDS=10 on the apps (docs/fase4/security.md)
//   E2E_EMAIL=... E2E_PASSWORD=... npm run test:logout-scope
// Prints statuses and names, never a password or a cookie.
import { chromium } from 'playwright'

const SHELL = (process.env.SHELL_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD
const MAX_IDLE_SECONDS = 120

const out = text => process.stdout.write(`${text}\n`)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let failures = 0
function check(label, actual, expected) {
  const ok = actual === expected
  if (!ok) failures += 1
  out(`${ok ? 'OK  ' : 'FAIL'} ${label}${ok ? '' : `: ${JSON.stringify(actual)} (want ${JSON.stringify(expected)})`}`)
}

// Each browser is its own context: its own cookie and its own idle timer
async function loggedInBrowser(browser) {
  const context = await browser.newContext({ locale: 'pt-BR' })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  await page.goto(SHELL)
  await page.getByRole('button', { name: 'Já tenho conta' }).first().click()
  await page.getByPlaceholder('seu@email.com').fill(EMAIL)
  await page.getByPlaceholder('••••••••').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL(`${SHELL}/dashboard`)
  return page
}

const sessionName = page => page.evaluate(() => fetch('/api/auth/session').then(response => response.json())).then(session => session?.user?.name ?? null)
async function landsOn(page, path) {
  await page.goto(`${SHELL}${path}`)
  return new URL(page.url()).pathname
}

// Activity keeps a browser's own idle timer from expiring while the other one waits
async function keepActive(page, ms) {
  const until = Date.now() + ms
  for (let step = 0; Date.now() < until; step += 1) {
    await page.mouse.move(100 + (step % 50), 100 + (step % 30))
    await sleep(1000)
  }
}

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error('Set E2E_EMAIL and E2E_PASSWORD (the demonstration user of the README)')
  const policy = await fetch(`${SHELL}/api/session-policy`).then(response => response.json())
  if (policy.idleTimeoutSeconds > MAX_IDLE_SECONDS) {
    throw new Error(`The idle timeout is ${policy.idleTimeoutSeconds} s: start the apps with IDLE_TIMEOUT_SECONDS=20 IDLE_WARNING_SECONDS=10`)
  }
  const idleMs = policy.idleTimeoutSeconds * 1000
  out(`Logout scope against ${SHELL}, idle logout after ${policy.idleTimeoutSeconds} s`)
  const browser = await chromium.launch({ channel: 'chrome' })
  try {
    // 1. The inactivity logout of browser A leaves browser B logged in
    const idle = await loggedInBrowser(browser)
    const other = await loggedInBrowser(browser)
    await Promise.all([
      idle.waitForURL(url => url.searchParams.get('reason') === 'idle', { timeout: idleMs + 30000 }),
      keepActive(other, idleMs + 5000),
    ])
    check('inactivity: the idle browser has no session', await sessionName(idle), null)
    check('inactivity: the idle browser goes back to the login', await landsOn(idle, '/dashboard'), '/')
    check('inactivity: the other browser keeps its session', (await sessionName(other)) !== null, true)
    check('inactivity: the other browser still opens /dashboard', await landsOn(other, '/dashboard'), '/dashboard')

    // 2. "Sair" of the menu in browser B ends the session of browser C too
    const third = await loggedInBrowser(browser)
    await other.getByRole('button', { name: 'Abrir menu de perfil' }).click()
    await other.getByRole('button', { name: 'Sair' }).click()
    await other.getByRole('dialog', { name: 'Sair da conta' }).getByRole('button', { name: 'Sair' }).click()
    await other.waitForURL(`${SHELL}/`)
    check('"Sair": the browser that left has no session', await sessionName(other), null)
    check('"Sair": the other browser has no session either', await sessionName(third), null)
    check('"Sair": the other browser goes back to the login', await landsOn(third, '/transactions'), '/')
  } finally {
    await browser.close()
  }
  out(failures === 0 ? 'All checks passed' : `${failures} checks failed`)
  process.exitCode = failures === 0 ? 0 : 1
}

main().catch(error => {
  process.stderr.write(`STOPPED: ${error.message.split('\n')[0]}\n`)
  process.exitCode = 2
})
