import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const Interaction = domainList({
    athlete: rel("Athlete.interaction_athlete", false),
    contact: rel("Contact.interaction_contact", false),
    brand: rel("Brand.interaction_brand", false),
    user: rel("User.interaction_user", false),
    kind: state(['call', 'meeting', 'email', 'text', 'visit', 'note']),
    occurredAt: timestamp(),
    summary: text({validation:{isRequired:true}}),
    nextStepAt: timestamp(),
}, "canManageAthletes", 'athlete', false);
