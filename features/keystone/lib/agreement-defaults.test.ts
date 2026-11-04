import test from 'node:test'
import assert from 'node:assert/strict'
import { agencyMutations } from '../mutations/agency'
function harness(rate=250,open=false){let created:any;const tx:any={$executeRaw:async()=>{},athlete:{findUnique:async()=>({leadAgentId:'u',supportStaff:[]})},agency:{findFirst:async()=>({defaultPlayingCommissionBps:rate,defaultEndorsementCommissionBps:1800})},representationAgreement:{findFirst:async()=>open?{id:'existing'}:null,create:async({data}:any)=>(created={id:'new',...data})},auditEvent:{create:async()=>({})},idempotencyKey:{findUnique:async()=>null,create:async()=>({id:'k'}),update:async()=>({})}};return {c:{session:{itemId:'u',data:{role:{canManageContracts:true}}},prisma:{$transaction:async(fn:any)=>fn(tx)}},get:()=>created}}
const args={athleteId:'a',capBps:300,idempotencyKey:'draft'}
test('snapshots agency rates, not hardcoded defaults',async()=>{const h=harness();await agencyMutations.draftRepresentationAgreement(null,args,h.c);assert.equal(h.get().playingCommissionBps,250);assert.equal(h.get().marketingCommissionBps,1800);assert.equal(h.get().status,'draft')})
test('refuses cap overrun without clipping',async()=>{const h=harness(400);await assert.rejects(()=>agencyMutations.draftRepresentationAgreement(null,args,h.c),/cap/);assert.equal(h.get(),undefined)})
test('refuses duplicate open agreement',async()=>{const h=harness(250,true);await assert.rejects(()=>agencyMutations.draftRepresentationAgreement(null,args,h.c),/already/);assert.equal(h.get(),undefined)})
test('refuses fractional union cap',async()=>{const h=harness();await assert.rejects(()=>agencyMutations.draftRepresentationAgreement(null,{...args,capBps:3.5},h.c),/cap/)})
