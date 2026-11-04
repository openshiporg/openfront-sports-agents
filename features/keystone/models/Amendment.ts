import { text, json } from "@keystone-6/core/fields";
import {domainList, state, rel} from "./domainFields";
// Append-only record of a change to a signed or active contract or deal. Created only by the amendTerms command.
export const Amendment = domainList({
    athlete: rel("Athlete.amendment_athlete", false),
    contract: rel("PlayingContract.amendment_contract", false),
    deal: rel("EndorsementDeal.amendment_deal", false),
    kind: state(['reschedule_payment', 'extend_deal_term', 'move_deliverable', 'add_deliverable', 'change_payment_terms', 'waive_payment', 'waive_deliverable']),
    reason: text({validation:{isRequired:true}}),
    before: json(),
    after: json(),
    appliedBy: rel("User.amendment_appliedBy", false),
}, "canManageAthletes", 'athlete', true);
