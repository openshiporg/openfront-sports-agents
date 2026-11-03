import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const Brand = domainList({
    name: text({validation:{isRequired:true}}),
    category: text(),
    contacts: rel("Contact.brand_contacts", true),
    website: text(),
    interaction_brand: rel("Interaction.brand", true),
    endorsementDeal_brand: rel("EndorsementDeal.brand", true),
}, "canManageEndorsements", undefined, false);
