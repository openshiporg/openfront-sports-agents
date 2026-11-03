import { text, integer, bigInt, checkbox, timestamp, calendarDay, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, cents, bps, state, rel} from "./domainFields";
export const CommissionInvoiceLine = domainList({
    invoice: rel("CommissionInvoice.commissionInvoiceLine_invoice", false),
    scheduledPayment: rel("ScheduledPayment.commissionInvoiceLine_scheduledPayment", false),
    description: text({validation:{isRequired:true}}),
    grossCents: cents(),
    commissionBps: bps(0),
    commissionCents: cents(),
    quantity: integer({defaultValue:1}),
    unitPriceCents: cents(),
    feesCents: cents(),
    taxCents: cents(),
    currencyCode: currencyCode(),
}, "canManageCommissions", 'invoice.athlete', true);
