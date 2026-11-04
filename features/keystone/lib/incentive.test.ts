import test from 'node:test'
import assert from 'node:assert/strict'
import { agencyMutations } from '../mutations/agency'

function harness(overrides: any = {}) {
  const incentive: any = { id:'i', status:'pending', amountCents:10000, currencyCode:'USD', contract:{id:'c', athleteId:'a', status:'signed', currencyCode:'USD', commissionBps:300}, ...overrides }
  const writes: any[] = []
  const tx: any = {
    $executeRaw: async()=>{}, athlete:{findUnique:async()=>({id:'a',leadAgentId:'u',supportStaff:[]})},
    incentive:{findUnique:async()=>incentive, updateMany:async({data}:any)=>{Object.assign(incentive,data);return {count:1}}},
    scheduledPayment:{create:async({data}:any)=>{writes.push(data);return {id:'p',...data}}},
    auditEvent:{create:async()=>({})}, idempotencyKey:{findUnique:async()=>null,create:async()=>({id:'key'}),update:async()=>({})},
  }
  const c:any = {session:{itemId:'u',data:{role:{canManageContracts:true}}},prisma:{...tx,$transaction:async(fn:any)=>fn(tx)}}
  return {c,incentive,writes}
}
const args={incentiveId:'i',evidence:'Official results',dueAt:'2027-01-10',idempotencyKey:'earned'}
test('earning schedules one receivable at signed rate without accruing commission',async()=>{const h=harness();await agencyMutations.recordIncentiveEarned(null,args,h.c);assert.equal(h.incentive.status,'earned');assert.equal(h.writes.length,1);assert.equal(h.writes[0].commissionBps,300);assert.equal(h.writes[0].status,'scheduled');assert.equal(h.writes[0].sourceKey,'incentive:i')})
for(const [name,overrides,a] of [['evidence',{}, {evidence:''}],['date',{}, {dueAt:'bad'}],['zero',{amountCents:0},{}],['currency',{currencyCode:'EUR'},{}],['already earned',{status:'earned'},{}],['unsigned',{contract:{athleteId:'a',status:'negotiating'}},{}]] as any[])test('refuses '+name,async()=>{const h=harness(overrides);await assert.rejects(()=>agencyMutations.recordIncentiveEarned(null,{...args,...a},h.c));assert.equal(h.writes.length,0)})
test('refuses unauthorized',async()=>{const h=harness();h.c.session.data.role.canManageContracts=false;await assert.rejects(()=>agencyMutations.recordIncentiveEarned(null,args,h.c),/authorized/);assert.equal(h.writes.length,0)})
