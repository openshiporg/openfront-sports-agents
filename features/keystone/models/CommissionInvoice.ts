import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const CommissionInvoice = domainList({
    payment_order: rel("Payment.order", true),
    athlete: rel("Athlete.commissionInvoice_athlete", false),
    number: text({isIndexed:"unique",validation:{isRequired:true}}),
    issuedAt: timestamp(),
    dueAt: timestamp(),
    totalCents: cents(),
    paidCents: cents(),
    status: state(['draft', 'sent', 'partially_paid', 'paid', 'void', 'written_off']),
    paymentCollection: rel("PaymentCollection.invoice", false),
    currencyCode: currencyCode(),
    scheduledPayment_invoice: rel("ScheduledPayment.invoice", true),
    commissionInvoiceLine_invoice: rel("CommissionInvoiceLine.invoice", true),
    commissionLedgerEntry_invoice: rel("CommissionLedgerEntry.invoice", true),
    clientTrustEntry_invoice: rel("ClientTrustEntry.invoice", true),
}, "canManageCommissions", 'athlete', true);
