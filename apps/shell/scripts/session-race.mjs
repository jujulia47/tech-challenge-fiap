#!/usr/bin/env node
// Regression test of the session race (docs/fase4/security.md, "The session race"): a read of the
// session that leaves before a write and answers after it must not bring the old cookie back.
// Holds every GET of the session for a while after the server answered, so the real answer comes
// late, then saves the name and logs out. Needs a running app and Chrome, so not in npm test:
//   E2E_EMAIL=... E2E_PASSWORD=... npm run test:session-race
//   SHELL_URL=https://bytebank-shell.vercel.app ROUNDS=3 ... to run it elsewhere
// Prints statuses and names, never a password or a cookie.
import { chromium } from 'playwright'

const SHELL = (process.env.SHELL_URL ?? 'http://localhost:3000').replace(/\/$/, '')
const EMAIL = process.env.E2E_EMAIL
const PASSWORD = process.env.E2E_PASSWORD
const ROUNDS = Number(process.env.ROUNDS ?? 3)
const HOLD_MS = 3000
const SETTLE_MS = HOLD_MS + 2000

const out = text => process.stdout.write(`${text}\n`)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
let failures = 0
function check(label, actual, expected) {
  const ok = actual === expected
  if (!ok) failures += 1
  out(`${ok ? 'OK  ' : 'FAIL'} ${label}${ok ? '' : `: ${JSON.stringify(actual)} (want ${JSON.stringify(expected)})`}`)
}

async function open(browser) {
  const context = await browser.newContext({ locale: 'pt-BR' })
  const page = await context.newPage()
  page.setDefaultTimeout(20000)
  page.held = false
  await context.route(/\/api\/auth\/session/, async route => {
    if (!page.held || route.request().method() !== 'GET') return route.continue()
    const response = await route.fetch()
    await sleep(HOLD_MS)
    return route.fulfill({ response })
  })
  return { context, page }
}

async function login(page) {
  await page.goto(SHELL)
  await page.getByRole('button', { name: 'Já tenho conta' }).first().click()
  await page.getByPlaceholder('seu@email.com').fill(EMAIL)
  await page.getByPlaceholder('••••••••').fill(PASSWORD)
  await page.getByRole('button', { name: 'Entrar', exact: true }).click()
  await page.waitForURL(`${SHELL}/dashboard`)
}

// React took over the button: a click before that would be a plain form post. Waiting for the
// network to go quiet instead would also wait for the held read, and the race would be gone.
const hydrated = (page, selector) => page.waitForFunction(
  target => Object.keys(document.querySelector(target) ?? {}).some(key => key.startsWith('__reactProps')),
  selector,
)
const sessionName = page => page.evaluate(() => fetch('/api/auth/session').then(response => response.json())).then(session => session?.user?.name ?? null)
const headerName = page => page.locator('header span.text-meta-semibold').first().innerText()
// What starts a read of the session on its own: the page loading, and the window getting the focus back
const provokeReads = page => page.evaluate(() => {
  document.dispatchEvent(new Event('visibilitychange'))
  window.dispatchEvent(new Event('focus'))
})

// Waits for the answer of the write itself: the toast of an earlier save may still be on the
// screen, and closing the page before the answer would leave the changed name behind
async function saveName(page, name) {
  await page.getByLabel('Nome', { exact: true }).fill(name)
  const saved = page.waitForResponse(response => response.url().endsWith('/api/account/profile') && response.request().method() === 'PATCH')
  await page.getByRole('button', { name: 'Salvar nome' }).click()
  const response = await saved
  if (!response.ok()) throw new Error(`saving the name answered ${response.status()}`)
  await page.getByText('Nome atualizado com sucesso').first().waitFor()
}

async function nameRound(browser, round) {
  const { context, page } = await open(browser)
  await login(page)
  page.held = true
  await page.goto(`${SHELL}/dashboard/account`, { waitUntil: 'domcontentloaded' })
  await hydrated(page, 'main form button[type="submit"]')
  const original = await page.getByLabel('Nome', { exact: true }).inputValue()
  const changed = `Corrida ${round}`
  await provokeReads(page)
  await saveName(page, changed)
  await sleep(SETTLE_MS)
  check(`name ${round}: the header keeps the new name`, await headerName(page), changed)
  check(`name ${round}: the session keeps the new name`, await sessionName(page), changed)
  page.held = false
  await saveName(page, original)
  await context.close()
}

async function logoutRound(browser, round) {
  const { context, page } = await open(browser)
  await login(page)
  page.held = true
  await page.goto(`${SHELL}/dashboard`, { waitUntil: 'domcontentloaded' })
  await hydrated(page, 'button[aria-label="Abrir menu de perfil"]')
  await provokeReads(page)
  await page.getByRole('button', { name: 'Abrir menu de perfil' }).click()
  await page.getByRole('button', { name: 'Sair' }).click()
  await page.getByRole('dialog', { name: 'Sair da conta' }).getByRole('button', { name: 'Sair' }).click()
  await page.waitForURL(`${SHELL}/`)
  await sleep(SETTLE_MS)
  page.held = false
  check(`logout ${round}: no session is left`, await sessionName(page), null)
  await page.goto(`${SHELL}/dashboard`)
  check(`logout ${round}: /dashboard goes back to the login`, new URL(page.url()).pathname, '/')
  await context.close()
}

async function main() {
  if (!EMAIL || !PASSWORD) throw new Error('Set E2E_EMAIL and E2E_PASSWORD (the demonstration user of the README)')
  out(`Session race against ${SHELL}, ${ROUNDS} rounds, session reads held ${HOLD_MS} ms`)
  const browser = await chromium.launch({ channel: 'chrome' })
  try {
    for (let round = 1; round <= ROUNDS; round += 1) await nameRound(browser, round)
    for (let round = 1; round <= ROUNDS; round += 1) await logoutRound(browser, round)
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
