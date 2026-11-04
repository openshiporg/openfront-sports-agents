import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const CommissionLedgerEntry = domainList({
    entryKey: text({isIndexed:"unique",validation:{isRequired:true}}),
    athlete: rel("Athlete.commissionLedgerEntry_athlete", false),
    invoice: rel("CommissionInvoice.commissionLedgerEntry_invoice", false),
    scheduledPayment: rel("ScheduledPayment.commissionLedgerEntry_scheduledPayment", false),
    entryType: state(['accrual', 'invoice', 'receipt', 'split_to_agent', 'reversal', 'write_off']),
    amountCents: bigInt({validation:{isRequired:true}}),
    payeeUser: rel("User.commissionLedgerEntry_payeeUser", false),
    reverses: rel("CommissionLedgerEntry.commissionLedgerEntry_reverses", false),
    reversalKey: text({isIndexed:"unique",db:{isNullable:true}}),
    reason: text({validation:{isRequired:true}}),
    preparedBy: rel("User.commissionLedgerEntry_preparedBy", false),
    approvedBy: rel("User.commissionLedgerEntry_approvedBy", false),
    occurredAt: timestamp(),
    currencyCode: currencyCode(),
    payoutEntry: rel("AgentPayoutEntry.ledgerEntry", false),
    commissionLedgerEntry_reverses: rel("CommissionLedgerEntry.reverses", true),
}, "canManageCommissions", 'athlete', true);
