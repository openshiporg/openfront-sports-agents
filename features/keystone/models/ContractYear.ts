import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const ContractYear = domainList({
    contract: rel("PlayingContract.contractYear_contract", false),
    season: text({validation:{isRequired:true}}),
    baseSalaryCents: cents(),
    guaranteedCents: cents(),
    rosterBonusCents: cents(),
    workoutBonusCents: cents(),
    payPeriods: integer({defaultValue:17,validation:{min:1,max:366}}),
    paySchedule: state(['game_checks', 'semi_monthly', 'lump_sum']),
    currencyCode: currencyCode(),
    scheduledPayment_contractYear: rel("ScheduledPayment.contractYear", true),
}, "canManageContracts", 'contract.athlete', false);
