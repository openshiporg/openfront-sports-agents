import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const EndorsementDeal = domainList({
    athlete: rel("Athlete.endorsementDeal_athlete", false),
    brand: rel("Brand.endorsementDeal_brand", false),
    owner: rel("User.endorsementDeal_owner", false),
    status: state(['prospect', 'negotiating', 'signed', 'active', 'completed', 'terminated']),
    termStart: timestamp(),
    termEnd: timestamp(),
    totalValueCents: cents(),
    commissionBps: bps(1500),
    exclusivityCategory: text(),
    territory: text(),
    document: rel("Document.endorsementDeal_document", false),
    paymentTerms: text(),
    currencyCode: currencyCode(),
    deliverable_deal: rel("Deliverable.deal", true),
    scheduledPayment_endorsementDeal: rel("ScheduledPayment.endorsementDeal", true),
    agentSplit_deal: rel("AgentSplit.deal", true),
    document_deal: rel("Document.deal", true),
    task_deal: rel("Task.deal", true),
}, "canManageEndorsements", 'athlete', false);
