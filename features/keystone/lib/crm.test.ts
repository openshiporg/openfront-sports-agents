import test from 'node:test'
import assert from 'node:assert/strict'
import { crmMutations } from '../mutations/crm'
function h(task:any={id:'t',status:'open',athleteId:'a',assigneeId:'u'},perm=true,all=false){
 const w:any={tasks:[],ints:[]};const t:any={...task};
 const tx:any={$executeRaw:async()=>{},athlete:{findUnique:async()=>({id:'a',leadAgentId:'u',supportStaff:[]})},
  interaction:{create:async({data}:any)=>{const r={id:'i',...data};w.ints.push(r);return r}},
  task:{create:async({data}:any)=>{w.tasks.push(data);return data},findUnique:async()=>t,updateMany:async({data}:any)=>{Object.assign(t,data);return {count:1}}},
  auditEvent:{create:async()=>({})},idempotencyKey:{findUnique:async()=>null,create:async()=>({id:'k'}),update:async()=>({})}};
 return {w,t,c:{session:{itemId:'u',data:{role:{canManageAthletes:perm,canViewAllClients:all}}},prisma:{...tx,$transaction:async(f:any)=>f(tx)}}};
}
const ia={athleteId:'a',kind:'call',summary:'Called agent',idempotencyKey:'k'}
test('logs interaction and creates follow-up task',async()=>{const x=h();await crmMutations.logInteraction(null,{...ia,nextStepAt:new Date(Date.now()+86400000).toISOString()},x.c);assert.equal(x.w.ints.length,1);assert.equal(x.w.tasks.length,1)})
for(const [n,p] of [['kind',{kind:'fax'}],['summary',{summary:' '}],['future date',{occurredAt:'2099-01-01'}],['next before event',{occurredAt:'2026-01-02',nextStepAt:'2026-01-01'}]] as any[])test('refuses '+n,async()=>{const x=h();await assert.rejects(()=>crmMutations.logInteraction(null,{...ia,...p},x.c));assert.equal(x.w.ints.length,0)})
test('refuses unauthorized interaction',async()=>{const x=h(undefined,false);await assert.rejects(()=>crmMutations.logInteraction(null,ia,x.c),/authorized/)})
test('completes athlete task',async()=>{const x=h();await crmMutations.completeTask(null,{taskId:'t',idempotencyKey:'c'},x.c);assert.equal(x.t.status,'completed')})
test('refuses completed task again',async()=>{const x=h({id:'t',status:'completed',athleteId:'a'});await assert.rejects(()=>crmMutations.completeTask(null,{taskId:'t',idempotencyKey:'c'},x.c),/transition/)})
test('athlete-less task limited to assignee',async()=>{const x=h({id:'t',status:'open',athleteId:null,assigneeId:'other'});await assert.rejects(()=>crmMutations.completeTask(null,{taskId:'t',idempotencyKey:'c'},x.c),/not found/);const y=h({id:'t',status:'open',athleteId:null,assigneeId:'u'});await crmMutations.completeTask(null,{taskId:'t',idempotencyKey:'c'},y.c);assert.equal(y.t.status,'completed')})
