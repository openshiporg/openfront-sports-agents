import { text, integer, bigInt, timestamp, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, rel, state} from "./domainFields";
// Append-only monthly copy of the deal forecast, one per calendar month. Created only by the snapshot command or the cron route.
export const ForecastSnapshot = domainList({
    month: text({validation:{isRequired:true,match:{regex:/^\d{4}-\d{2}$/,explanation:'YYYY-MM'}},isIndexed:'unique'}),
    takenAt: timestamp({defaultValue:{kind:'now'}}),
    takenBy: rel("User.forecastSnapshot_takenBy", false),
    source: state(['manual', 'cron']),
    currencyCode: currencyCode(),
    dealCount: integer({defaultValue:0}),
    grossCents: bigInt({validation:{isRequired:true}}),
    weightedCents: bigInt({validation:{isRequired:true}}),
    firstMonthGrossCents: bigInt({validation:{isRequired:true}}),
    firstMonthWeightedCents: bigInt({validation:{isRequired:true}}),
    probabilities: json(),
    months: json(),
    stages: json(),
    agents: json(),
}, "canManageOnboarding", undefined, true);
