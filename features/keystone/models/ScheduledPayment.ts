import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const ScheduledPayment = domainList({
    sourceKey: text({isIndexed:"unique",validation:{isRequired:true}}),
    contractYear: rel("ContractYear.scheduledPayment_contractYear", false),
    endorsementDeal: rel("EndorsementDeal.scheduledPayment_endorsementDeal", false),
    incentive: rel("Incentive.scheduledPayment_incentive", false),
    athlete: rel("Athlete.scheduledPayment_athlete", false),
    dueAt: timestamp(),
    grossCents: cents(),
    commissionBps: bps(0),
    commissionCents: cents(),
    remainder: integer({defaultValue:0}),
    // Part of the original instalment given up by amendment. Original amount = grossCents + waivedCents.
    waivedCents: cents(),
    receivedAt: timestamp(),
    status: state(['scheduled', 'received', 'late', 'waived']),
    currencyCode: currencyCode(),
    invoice: rel("CommissionInvoice.scheduledPayment_invoice", false),
    commissionInvoiceLine_scheduledPayment: rel("CommissionInvoiceLine.scheduledPayment", true),
    commissionLedgerEntry_scheduledPayment: rel("CommissionLedgerEntry.scheduledPayment", true),
}, "canManageCommissions", 'athlete', true);
