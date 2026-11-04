import { bigInt, relationship } from "@keystone-6/core/fields";
import {domainList, rel} from "./domainFields";
// One settled ledger entry. The one-to-one link is unique, so a split or reversal can be settled once.
export const AgentPayoutEntry = domainList({
    payout: rel("AgentPayout.entries", false),
    ledgerEntry: relationship({ref:"CommissionLedgerEntry.payoutEntry", db:{foreignKey:true}}),
    amountCents: bigInt({validation:{isRequired:true}}),
}, "canManageCommissions", undefined, true);
