import crypto from 'node:crypto';
import {permissionNames, permissions} from '../access';
import {agencyMutations} from './agency';

const dt = (v: any) => (v ? new Date(v) : undefined);
const days = (n: number) => new Date(Date.now() + n * 86400000);
const clean = (o: any) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));

async function must(db: any, model: string, where: any, label: string) {
  const row = await db[model].findFirst({where});
  if (!row) throw new Error(`${label} not found`);
  return row;
}
async function findOrCreate(db: any, model: string, where: any, data: any) {
  return (await db[model].findFirst({where})) || db[model].create({data});
}

type Handler = (c: any, d: any) => Promise<any>;
const handlers: Record<string, Handler> = {
  async Agency(c, d) {
    const db = c.prisma;
    return (await db.agency.findFirst()) || db.agency.create({data: d});
  },
  async Role(c, d) {
    const db = c.prisma;
    const flags = Object.fromEntries(permissionNames.map(n => [n, (d.permissions || []).includes(n) || d.permissions?.includes('*')]));
    return (await db.role.findFirst({where: {name: d.name}})) || db.role.create({data: {name: d.name, ...flags}});
  },
  async Staff(c, d) {
    const db = c.prisma;
    const existing = await db.user.findFirst({where: {email: d.email}});
    if (existing) return existing;
    const role = await must(db, 'role', {name: d.role}, 'Role');
    // Keystone hashes the password field; staff set their own via reset.
    return c.sudo().query.User.createOne({data: {name: d.name, email: d.email, password: crypto.randomBytes(18).toString('base64url'), role: {connect: {id: role.id}}}, query: 'id'});
  },
  async AgentCertification(c, d) {
    const db = c.prisma;
    const user = await must(db, 'user', {email: d.userEmail}, 'Agent');
    return findOrCreate(db, 'agentCertification', {number: d.number}, {userId: user.id, body: d.body, number: d.number, issuedAt: dt(d.issuedAt), expiresAt: d.expiresInDays != null ? days(d.expiresInDays) : dt(d.expiresAt), status: d.status || 'active'});
  },
  async Team(c, d) {
    return findOrCreate(c.prisma, 'team', {name: d.name, league: d.league}, d);
  },
  async Athlete(c, d) {
    const db = c.prisma;
    const lead = d.leadAgentEmail ? await must(db, 'user', {email: d.leadAgentEmail}, 'Lead agent') : null;
    const team = d.team ? await must(db, 'team', {name: d.team}, 'Team') : null;
    const support = d.supportEmails?.length ? await db.user.findMany({where: {email: {in: d.supportEmails}}, select: {id: true}}) : [];
    const {leadAgentEmail, team: _t, supportEmails, dateOfBirth, representationStartedAt, contactAllowedInDays, ...rest} = d;
    const existing = await db.athlete.findFirst({where: {fullName: d.fullName}});
    if (existing) return existing;
    return db.athlete.create({data: clean({...rest, dateOfBirth: dt(dateOfBirth), representationStartedAt: dt(representationStartedAt), contactAllowedFrom: contactAllowedInDays != null ? days(contactAllowedInDays) : undefined, leadAgentId: lead?.id, teamId: team?.id, supportStaff: support.length ? {connect: support} : undefined})});
  },
  async RepresentationAgreement(c, d) {
    const db = c.prisma;
    const athlete = await must(db, 'athlete', {fullName: d.athlete}, 'Athlete');
    const agent = await must(db, 'user', {email: d.agentEmail}, 'Agent');
    const {athlete: _a, agentEmail, effectiveAt, expiresAt, expiresInDays, ...rest} = d;
    return findOrCreate(db, 'representationAgreement', {athleteId: athlete.id, scope: d.scope}, clean({...rest, athleteId: athlete.id, agentId: agent.id, effectiveAt: dt(effectiveAt), expiresAt: expiresInDays != null ? days(expiresInDays) : dt(expiresAt), filedAt: d.status === 'filed_with_union' || d.status === 'active' ? dt(effectiveAt) : undefined}));
  },
  async Contact(c, d) {
    const db = c.prisma;
    const athletes = d.athletes?.length ? await db.athlete.findMany({where: {fullName: {in: d.athletes}}, select: {id: true}}) : [];
    const {athletes: _a, ...rest} = d;
    return findOrCreate(db, 'contact', {name: d.name, org: d.org}, {...rest, athletes: athletes.length ? {connect: athletes} : undefined});
  },
  async Brand(c, d) {
    const db = c.prisma;
    const contacts = d.contacts?.length ? await db.contact.findMany({where: {name: {in: d.contacts}}, select: {id: true}}) : [];
    const {contacts: _c, ...rest} = d;
    return findOrCreate(db, 'brand', {name: d.name}, {...rest, contacts: contacts.length ? {connect: contacts} : undefined});
  },
  async PlayingContract(c, d) {
    const db = c.prisma;
    const athlete = await must(db, 'athlete', {fullName: d.athlete}, 'Athlete');
    const team = d.team ? await must(db, 'team', {name: d.team}, 'Team') : null;
    const agreement = await must(db, 'representationAgreement', {athleteId: athlete.id, scope: {in: ['playing', 'both']}}, 'Playing agreement');
    const existing = await db.playingContract.findFirst({where: {athleteId: athlete.id, startSeason: d.startSeason}});
    if (existing) return existing;
    const {athlete: _a, team: _t, years = [], incentives = [], signedAt, ...rest} = d;
    const contract = await db.playingContract.create({data: clean({...rest, athleteId: athlete.id, teamId: team?.id, representationAgreementId: agreement.id, commissionBps: agreement.playingCommissionBps, signedAt: dt(signedAt)})});
    for (const y of years) await db.contractYear.create({data: {...y, contractId: contract.id}});
    for (const i of incentives) await db.incentive.create({data: {...i, contractId: contract.id}});
    return contract;
  },
  async EndorsementDeal(c, d) {
    const db = c.prisma;
    const athlete = await must(db, 'athlete', {fullName: d.athlete}, 'Athlete');
    const brand = await must(db, 'brand', {name: d.brand}, 'Brand');
    const owner = await must(db, 'user', {email: d.ownerEmail}, 'Owner');
    const termStart = d.termStartInDays != null ? days(d.termStartInDays) : dt(d.termStart);
    const termEnd = d.termEndInDays != null ? days(d.termEndInDays) : dt(d.termEnd);
    const existing = await db.endorsementDeal.findFirst({where: {athleteId: athlete.id, brandId: brand.id, exclusivityCategory: d.exclusivityCategory}});
    if (existing) return existing;
    const {athlete: _a, brand: _b, ownerEmail, deliverables = [], termStartInDays, termEndInDays, activate, status, ...rest} = d;
    const deal = await db.endorsementDeal.create({data: clean({...rest, athleteId: athlete.id, brandId: brand.id, ownerId: owner.id, termStart, termEnd, status: activate ? 'negotiating' : status, commissionBps: rest.commissionBps ?? 1500})});
    for (const x of deliverables) await db.deliverable.create({data: clean({dealId: deal.id, kind: x.kind, notes: x.notes, status: x.status || 'scheduled', dueAt: days(x.dueInDays), completedAt: x.status === 'completed' ? days(x.dueInDays) : undefined, proofLink: x.status === 'completed' ? 'https://proof.meridiansports.example/' + crypto.randomBytes(4).toString('hex') : undefined})});
    if (activate) {
      // Same exclusivity rule and audit as the operator command; a blocked deal stays negotiating.
      try { await agencyMutations.activateEndorsementDeal(null, {dealId: deal.id, idempotencyKey: 'seed:activate:' + deal.id}, c); } catch (e: any) { if (!/Exclusivity/.test(e.message)) throw e; }
    }
    return deal;
  },
  async AgentSplit(c, d) {
    const db = c.prisma;
    const athlete = await must(db, 'athlete', {fullName: d.athlete}, 'Athlete');
    const user = await must(db, 'user', {email: d.userEmail}, 'Agent');
    return findOrCreate(db, 'agentSplit', {athleteId: athlete.id, userId: user.id}, {athleteId: athlete.id, userId: user.id, shareBps: d.shareBps});
  },
  async PaymentProvider(c, d) {
    return findOrCreate(c.prisma, 'paymentProvider', {code: d.code}, d);
  },
  // Money: runs the same domain commands as operators (schedule, receipt/accrual, invoice, payment, reversal, trust).
  async Money(c, d) {
    const db = c.prisma;
    const run = (name: string, args: any) => (agencyMutations as any)[name](null, args, c);
    for (const contract of await db.playingContract.findMany({where: {status: 'signed'}})) await run('generatePaymentSchedule', {contractId: contract.id, idempotencyKey: 'seed:sched:' + contract.id});
    for (const deal of await db.endorsementDeal.findMany({where: {status: 'active'}})) await run('generatePaymentSchedule', {dealId: deal.id, idempotencyKey: 'seed:sched:' + deal.id});
    const dueAll = await db.scheduledPayment.findMany({where: {status: 'scheduled', dueAt: {lt: new Date()}}, orderBy: [{dueAt: 'asc'}, {id: 'asc'}], take: 500});
    const taken = new Map<string, number>();
    const due = dueAll.filter((p: any) => { const n = taken.get(p.athleteId) || 0; if (n >= 3 || [...taken.values()].reduce((a, b) => a + b, 0) >= (d.receive ?? 14)) return false; taken.set(p.athleteId, n + 1); return true; });
    for (const p of due) await run('markPaymentReceived', {scheduledPaymentId: p.id, idempotencyKey: 'seed:recv:' + p.id});
    await db.scheduledPayment.updateMany({where: {status: 'scheduled', dueAt: {lt: days(-30)}}, data: {status: 'late'}});
    const received = await db.scheduledPayment.findMany({where: {status: 'received', invoiceId: null, commissionCents: {gt: 0}}, orderBy: {id: 'asc'}});
    const byAthlete = new Map<string, any[]>();
    for (const p of received) byAthlete.set(p.athleteId, [...(byAthlete.get(p.athleteId) || []), p]);
    const plan = ['draft', 'sent', 'partially_paid', 'paid', 'void'];
    let i = 0;
    let firstReceipt: any = null;
    for (const [athleteId, list] of byAthlete) {
      if (i >= plan.length) break;
      const status = plan[i++];
      const invoice: any = await run('draftCommissionInvoice', {athleteId, scheduledPaymentIds: list.slice(0, 3).map(p => p.id), idempotencyKey: 'seed:inv:' + athleteId});
      if (status === 'void') { await run('voidCommissionInvoice', {invoiceId: invoice.id, reason: 'Issued in error', idempotencyKey: 'seed:void:' + invoice.id}); continue; }
      if (status === 'draft') continue;
      await run('sendCommissionInvoice', {invoiceId: invoice.id, idempotencyKey: 'seed:send:' + invoice.id});
      if (status === 'partially_paid') await run('recordInvoicePayment', {invoiceId: invoice.id, amountCents: Math.max(1, Math.floor(invoice.totalCents / 2)), reference: 'Wire received', idempotencyKey: 'seed:pay:' + invoice.id});
      if (status === 'paid') await run('recordInvoicePayment', {invoiceId: invoice.id, amountCents: invoice.totalCents, reference: 'Wire received', idempotencyKey: 'seed:pay:' + invoice.id});
    }
    // One misposted receipt on an open invoice, corrected by an exact reversal: net zero, invoice back to its true balance.
    const open = await db.commissionInvoice.findFirst({where: {status: 'sent'}, orderBy: {number: 'asc'}});
    if (open) {
      await run('recordInvoicePayment', {invoiceId: open.id, amountCents: 100000, reference: 'Wire posted to wrong client', idempotencyKey: 'seed:misposted:' + open.id});
      const bad = await db.commissionLedgerEntry.findFirst({where: {invoiceId: open.id, entryType: 'receipt'}});
      if (bad) await run('reverseLedgerEntry', {entryId: bad.id, reason: 'Misposted wire corrected by accounting', idempotencyKey: 'seed:rev:' + bad.id});
    }
    const trustAthlete = d.trustAthlete ? await db.athlete.findFirst({where: {fullName: d.trustAthlete}}) : null;
    if (trustAthlete) {
      const account = await findOrCreate(db, 'clientTrustAccount', {athleteId: trustAthlete.id}, {athleteId: trustAthlete.id, name: trustAthlete.fullName + ' client funds', currencyCode: 'USD'});
      await run('postTrustEntry', {accountId: account.id, entryType: 'deposit', amountCents: d.trustDepositCents || 5000000, reference: 'Endorsement payment held for client', idempotencyKey: 'seed:trust:dep:' + account.id});
    }
    await run('generateAutoTasks', {});
    return {id: 'money'};
  },
};

export default async function ensureOnboardingRecord(_root: unknown, {entity, data}: {entity: string; data: any}, context: any) {
  if (!context.session?.itemId || !permissions.canManageOnboarding({session: context.session})) throw new Error('Not authorized');
  const handler = handlers[entity];
  if (!handler) throw new Error('Unsupported setup record');
  const record = await handler(context, data);
  if (!record?.id) throw new Error(`${entity} setup did not return a persisted record`);
  return {id: record.id};
}
