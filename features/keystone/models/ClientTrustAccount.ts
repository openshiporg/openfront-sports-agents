import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const ClientTrustAccount = domainList({
    athlete: rel("Athlete.clientTrustAccount_athlete", false),
    name: text({validation:{isRequired:true}}),
    currencyCode: currencyCode(),
    clientTrustEntry_account: rel("ClientTrustEntry.account", true),
}, "canManageTrust", 'athlete', false);
