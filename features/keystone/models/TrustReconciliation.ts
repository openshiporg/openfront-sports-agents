import { text, bigInt, calendarDay, timestamp, json } from "@keystone-6/core/fields";
import {domainList, currencyCode, rel, state} from "./domainFields";
// Append-only bank statement reconciliation of the pooled client trust account, one currency at a time.
// Created only by reconcileTrustStatement; reopenTrustReconciliation is the only change (it releases the entries it cleared).
export const TrustReconciliation = domainList({
    currencyCode: currencyCode(),
    statementDate: calendarDay({validation:{isRequired:true}}),
    statementBalanceCents: bigInt({validation:{isRequired:true}}),
    bookCents: bigInt({validation:{isRequired:true}}),
    clearedCents: bigInt({validation:{isRequired:true}}),
    outstandingCents: bigInt({validation:{isRequired:true}}),
    differenceCents: bigInt({validation:{isRequired:true}}),
    status: state(['reconciled', 'exception', 'reopened']),
    note: text(),
    clientBalances: json(),
    preparedBy: rel("User.trustReconciliation_preparedBy", false),
    reopenedAt: timestamp(),
    reopenReason: text(),
    reopenedBy: rel("User.trustReconciliation_reopenedBy", false),
    clearedEntries: rel("ClientTrustEntry.clearedIn", true),
}, "canManageTrust", undefined, true);
