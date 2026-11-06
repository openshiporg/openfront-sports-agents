import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
import { storeLogoFields } from "./storeLogoFields";
export const Agency = domainList({
    name: text({validation:{isRequired:true}}),
    defaultPlayingCommissionBps: bps(300),
    defaultEndorsementCommissionBps: bps(1500),
    currencyCode: currencyCode(),
    fiscalYearStart: integer({defaultValue:1,validation:{min:1,max:12}}),
    refundApprovalThresholdCents: cents(),
    ...storeLogoFields,
    forecastProbabilities: json({defaultValue:{prospect:10,negotiating:40,signed:90,active:100},access:{create:()=>false,update:()=>false}}),
}, "canManageOnboarding", undefined, false);
