import { text, bigInt, calendarDay } from "@keystone-6/core/fields";
import {domainList, currencyCode, rel} from "./domainFields";
// Append-only record that the agency paid an agent. Created only by the recordAgentPayout command.
export const AgentPayout = domainList({
    payee: rel("User.agentPayout_payee", false),
    reference: text({validation:{isRequired:true}}),
    method: text(),
    note: text(),
    paidOn: calendarDay({validation:{isRequired:true}}),
    totalCents: bigInt({validation:{isRequired:true}}),
    currencyCode: currencyCode(),
    recordedBy: rel("User.agentPayout_recordedBy", false),
    entries: rel("AgentPayoutEntry.payout", true),
}, "canManageCommissions", undefined, true);
