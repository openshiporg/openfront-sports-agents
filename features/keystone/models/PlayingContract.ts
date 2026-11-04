import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const PlayingContract = domainList({
    athlete: rel("Athlete.playingContract_athlete", false),
    team: rel("Team.playingContract_team", false),
    league: text(),
    contractType: state(['rookie_scale', 'veteran', 'extension', 'two_way', 'minor_league', 'college_nil', 'other']),
    signedAt: timestamp(),
    startSeason: text(),
    endSeason: text(),
    totalValueCents: cents(),
    guaranteedCents: cents(),
    signingBonusCents: cents(),
    status: state(['negotiating', 'signed', 'active', 'completed', 'terminated', 'released']),
    document: rel("Document.playingContract_document", false),
    commissionBps: bps(0),
    representationAgreement: rel("RepresentationAgreement.playingContract_representationAgreement", false),
    currencyCode: currencyCode(),
    contractYear_contract: rel("ContractYear.contract", true),
    incentive_contract: rel("Incentive.contract", true),
    document_contract: rel("Document.contract", true),
    task_contract: rel("Task.contract", true),
    amendment_contract: rel("Amendment.contract", true),
}, "canManageContracts", 'athlete', true);
