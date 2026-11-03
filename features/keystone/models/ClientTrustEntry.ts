import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const ClientTrustEntry = domainList({
    account: rel("ClientTrustAccount.clientTrustEntry_account", false),
    athlete: rel("Athlete.clientTrustEntry_athlete", false),
    invoice: rel("CommissionInvoice.clientTrustEntry_invoice", false),
    entryType: state(['deposit', 'commission_transfer', 'disbursement_to_client', 'reversal']),
    amountCents: bigInt({validation:{isRequired:true}}),
    reference: text({validation:{isRequired:true}}),
    occurredAt: timestamp(),
    reverses: rel("ClientTrustEntry.clientTrustEntry_reverses", false),
    reversalKey: text({isIndexed:"unique",db:{isNullable:true}}),
    currencyCode: currencyCode(),
    clientTrustEntry_reverses: rel("ClientTrustEntry.reverses", true),
}, "canManageTrust", 'athlete', true);
