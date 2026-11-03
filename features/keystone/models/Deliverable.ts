import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const Deliverable = domainList({
    deal: rel("EndorsementDeal.deliverable_deal", false),
    kind: state(['social_post', 'appearance', 'photo_shoot', 'commercial', 'autograph_session', 'other']),
    dueAt: timestamp(),
    status: state(['scheduled', 'completed', 'missed', 'waived']),
    completedAt: timestamp(),
    proofLink: text(),
    proof: rel("Document.deliverable_proof", false),
    notes: text(),
}, "canManageEndorsements", 'deal.athlete', false);
