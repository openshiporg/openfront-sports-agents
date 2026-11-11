// Load every dashboard and public page as each role; print PASS/FAIL per page.
// Usage: CRAWL_BASE=<url> CRAWL_LOGINS=<json {role:{email,password}}> node scripts/r6-crawl.mjs [roles...]
import fs from 'node:fs'
import { chromium } from '/Users/junaid/Code/vibeghost/vibeghost/node_modules/playwright/index.mjs'

const BASE = process.env.CRAWL_BASE
const people = JSON.parse(fs.readFileSync(process.env.CRAWL_LOGINS, 'utf8'))
const roles = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(people)
const ownerKey = process.env.CRAWL_OWNER || roles[0]

async function gql(query, cookie) {
  const r = await fetch(BASE + '/api/graphql', { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify({ query }) })
  return r.json()
}
const p0 = people[ownerKey]
const tr = await (await fetch(BASE + '/api/graphql', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query: 'mutation($e:String!,$p:String!){authenticateUserWithPassword(email:$e,password:$p){... on UserAuthenticationWithPasswordSuccess{sessionToken}}}', variables: { e: p0.email, p: p0.password } }) })).json()
const cookie = 'keystonejs-session=' + tr.data?.authenticateUserWithPassword?.sessionToken
const dr = await gql('{athletes(take:1){id} contacts(take:1){id} playingContracts(take:1){id} endorsementDeals(take:1){id} commissionInvoices(take:1){id}}', cookie)
if (!dr.data) { console.log('CHECK id lookup: FAIL ' + JSON.stringify(dr.errors?.[0]?.message)); process.exit(1) }
const d = dr.data
const lists = ['clients', 'commissions', 'settings', 'tasks', 'calendar', 'brands', 'contracts', 'endorsements', 'trust', 'certifications', 'workload', 'approvals', 'payment-providers', 'recruiting', 'store']
const paths = lists.map(l => '/dashboard/platform/' + l)
paths.push('/dashboard/platform/clients/nope123', '/dashboard/platform/contracts/nope123', '/dashboard/platform/endorsements/nope123', '/athletes/nope123', '/invoice/nope123')
if (d.athletes[0]) paths.push('/dashboard/platform/clients/' + d.athletes[0].id, '/athletes/' + d.athletes[0].id)
if (d.playingContracts[0]) paths.push('/dashboard/platform/contracts/' + d.playingContracts[0].id)
if (d.endorsementDeals[0]) paths.push('/dashboard/platform/endorsements/' + d.endorsementDeals[0].id)
if (d.commissionInvoices[0]) paths.push('/invoice/' + d.commissionInvoices[0].id)
const b = await chromium.launch({ executablePath: process.env.HOME + '/Library/Caches/ms-playwright/chromium_headless_shell-1254/chrome-headless-shell-mac-arm64/chrome-headless-shell' })
let bad = 0, n = 0
for (const role of roles) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, ignoreHTTPSErrors: true })
  const p = await ctx.newPage()
  await p.goto(BASE + '/dashboard/signin')
  await p.fill('input[name=email]', people[role].email)
  await p.fill('input[name=password]', people[role].password)
  await Promise.all([p.waitForURL(u => !u.pathname.includes('signin'), { timeout: 30000 }), p.click('button[type=submit]')])
  for (const path of paths) {
    const r = await p.goto(BASE + path, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => null)
    const txt = await p.evaluate(() => document.body.innerText).catch(() => '')
    const http = r?.status() ?? 0
    const broken = /this page could not be loaded|something went wrong|application error|internal server error/i.test(txt)
    const expect404 = path.endsWith('nope123')
    const ok = http !== 500 && !broken && (expect404 ? http === 404 : (http === 200 || http === 404))
    n++; if (!ok) bad++
    console.log(`CHECK ${role} ${path}: ${ok ? 'PASS' : 'FAIL'} (${http}${expect404 ? ' expected 404' : ''})`)
  }
  await ctx.close()
}
await b.close()
console.log(`CHECK all pages: ${bad ? 'FAIL' : 'PASS'} (${n} loads, ${bad} failed)`)
