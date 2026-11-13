// Run with DATABASE_URL pointing at a scratch DB with migrations applied:
//   DATABASE_URL=... node --import tsx --test features/keystone/lib/relationFilter.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { getContext } from '@keystone-6/core/context'
import * as PrismaModule from '@prisma/client'
import config from '../index'
import { permissionNames } from '../access'

const base: any = getContext(config as any, PrismaModule as any)
const sudo = base.sudo()
const stamp = Date.now().toString(36)
const perms = (on: string[]) => Object.fromEntries(permissionNames.map(n => [n, on.includes(n)]))
// Limited roles hold every permission that opens a list, but not canViewAllClients (so their athlete scope is empty).
const limited = permissionNames.filter(n => n !== 'canViewAllClients' && n !== 'canManageRoles')
// Accountant: sees every client scope and the money lists, but cannot read athletes.
const accountant = ['canAccessDashboard', 'canViewAllClients', 'canManageCommissions', 'canReadPayments', 'canSeeOtherPeople']
const ids: Record<string, string> = {}
const sessionFor = (key: string, roleName: string, on: string[]) => base.withSession({ itemId: ids[key], listKey: 'User', data: { name: key, role: { id: ids['role' + roleName], name: roleName, ...perms(on) } } })

test('setup', async () => {
  const mk = async (name: string, on: string[]) => (ids['role' + name] = (await sudo.db.Role.createOne({ data: { name, ...perms(on) } })).id)
  await mk('Admin', [...permissionNames]); await mk('Agent', limited); await mk('Accountant', accountant)
  for (const [k, r] of [['admin', 'Admin'], ['agent', 'Agent'], ['acct', 'Accountant']]) ids[k] = (await sudo.db.User.createOne({ data: { name: k + stamp, email: `${k}${stamp}@example.com`, password: 'passw0rd-passw0rd', role: { connect: { id: ids['role' + r] } } } })).id
  const team = await sudo.db.Team.createOne({ data: { name: 'Zeta' + stamp } })
  const ath = await sudo.db.Athlete.createOne({ data: { fullName: 'Hidden Athlete', email: 'hidden@clients.example', phone: '+1 512 555 0100', team: { connect: { id: team.id } } } })
  const inv = await sudo.db.CommissionInvoice.createOne({ data: { number: 'INV-' + stamp, athlete: { connect: { id: ath.id } } } })
  await sudo.db.Payment.createOne({ data: { idempotencyKey: 'k' + stamp, amount: 36264705, order: { connect: { id: inv.id } } } })
  const brand = await sudo.db.Brand.createOne({ data: { name: 'Brand' + stamp } })
  await sudo.db.EndorsementDeal.createOne({ data: { athlete: { connect: { id: ath.id } }, brand: { connect: { id: brand.id } }, totalValueCents: 600000000 } })
})

const probes = (hit: boolean) => {
  const n = hit ? 36264705 : 36264706
  const pay = `payment_order:{some:{amount:{gte:${n}}}}`
  return [
    `{teamsCount(where:{athlete_team:{some:{commissionInvoice_athlete:{some:{${pay}}}}}})}`,
    `{teamsCount(where:{athlete_team:{some:{email:{startsWith:"${hit ? 'hidden' : 'zzz'}"}}}})}`,
    `{brandsCount(where:{endorsementDeal_brand:{some:{totalValueCents:{gte:${hit ? 600000000 : 600000001}}}}})}`,
    `{usersCount(where:{athlete_leadAgent:{some:{email:{startsWith:"${hit ? 'hidden' : 'zzz'}"}}}})}`,
    `{commissionInvoicesCount(where:{athlete:{phone:{startsWith:"${hit ? '+1 512' : '+9'}"}}})}`,
    `{rolesCount(where:{assignedTo:{some:{athlete_leadAgent:{some:{email:{startsWith:"${hit ? 'hidden' : 'zzz'}"}}}}}})}`,
    `{contactsCount(where:{athletes:{some:{phone:{startsWith:"${hit ? '+1 512' : '+9'}"}}}})}`,
    `{agentCertificationsCount(where:{user:{athlete_leadAgent:{some:{email:{startsWith:"${hit ? 'hidden' : 'zzz'}"}}}}})}`,
  ]
}
const run = async (ctx: any, q: string) => { const r = await ctx.graphql.raw({ query: q }); return r.errors?.length ? 'error' : Object.values(r.data as any)[0] }

for (const who of ['anon', 'agent', 'acct'] as const) {
  test(`${who} cannot tell a present value from a missing one through relation filters`, async () => {
    const ctx = who === 'anon' ? base : sessionFor(who, who === 'agent' ? 'Agent' : 'Accountant', who === 'agent' ? limited : accountant)
    const a = probes(true), b = probes(false)
    for (let i = 0; i < a.length; i++) {
      const [x, y] = [await run(ctx, a[i]), await run(ctx, b[i])]
      console.log(who, i, x, y)
      assert.ok(x === 'error' || x === y, `${who} probe ${i}: ${x} vs ${y}`)
    }
  })
}

test('admin keeps real relation filters', async () => {
  const ctx = sessionFor('admin', 'Admin', [...permissionNames])
  assert.ok(Number(await run(ctx, probes(true)[0])) >= 1)
  assert.equal(await run(ctx, probes(false)[0]), 0)
  assert.ok(Number(await run(ctx, probes(true)[2])) >= 1)
  assert.equal(await run(ctx, probes(false)[2]), 0)
})
