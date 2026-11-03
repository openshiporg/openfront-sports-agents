import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const Contact = domainList({
    name: text({validation:{isRequired:true}}),
    org: text(),
    role: text(),
    email: text(),
    phone: text(),
    athletes: rel("Athlete.contact_athletes", true),
    doNotContact: checkbox({defaultValue:false}),
    brand_contacts: rel("Brand.contacts", true),
    interaction_contact: rel("Interaction.contact", true),
}, "canManageAthletes", undefined, false);
