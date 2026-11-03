import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const Incentive = domainList({
    contract: rel("PlayingContract.incentive_contract", false),
    description: text({validation:{isRequired:true}}),
    amountCents: cents(),
    likelyToBeEarned: checkbox(),
    status: state(['pending', 'earned', 'not_earned']),
    earnedAt: timestamp(),
    evidence: text(),
    currencyCode: currencyCode(),
    scheduledPayment_incentive: rel("ScheduledPayment.incentive", true),
}, "canManageContracts", 'contract.athlete', false);
