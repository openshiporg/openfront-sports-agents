import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const RepresentationAgreement = domainList({
    athlete: rel("Athlete.representationAgreement_athlete", false),
    agent: rel("User.representationAgreement_agent", false),
    scope: state(['playing', 'marketing', 'both']),
    playingCommissionBps: bps(300),
    marketingCommissionBps: bps(1500),
    capBps: bps(300),
    effectiveAt: timestamp(),
    expiresAt: timestamp(),
    terminationNoticeDays: integer({defaultValue:30,validation:{min:0}}),
    status: state(['draft', 'sent', 'signed', 'filed_with_union', 'active', 'terminated', 'expired']),
    signedDocument: rel("Document.representationAgreement_signedDocument", false),
    filedAt: timestamp(),
    playingContract_representationAgreement: rel("PlayingContract.representationAgreement", true),
    document_agreement: rel("Document.agreement", true),
}, "canManageContracts", 'athlete', false);
