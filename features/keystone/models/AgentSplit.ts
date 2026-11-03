import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const AgentSplit = domainList({
    athlete: rel("Athlete.agentSplit_athlete", false),
    deal: rel("EndorsementDeal.agentSplit_deal", false),
    user: rel("User.agentSplit_user", false),
    shareBps: bps(0),
}, "canManageCommissions", 'athlete', true);
