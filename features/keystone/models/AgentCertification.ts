import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const AgentCertification = domainList({
    user: rel("User.agentCertification_user", false),
    body: state(['NFLPA', 'NBPA', 'MLBPA', 'NHLPA', 'MLSPA', 'FIFA', 'NCAA_NIL_STATE', 'other']),
    number: text({validation:{isRequired:true}}),
    issuedAt: timestamp(),
    expiresAt: timestamp(),
    status: state(['active', 'expired', 'suspended']),
    document: rel("Document.agentCertification_document", false),
}, "canManageContracts", undefined, false);
