import { list } from "@keystone-6/core";
import { integer, json, relationship, select, text, timestamp } from "@keystone-6/core/fields";
import { permissions, canFilterRelations } from "../access";
import { paymentOwnerFilter, canSeePayments } from "./Payment";
import { trackingFields } from "./trackingFields";

export const Refund = list({
  access: {
    operation: {
      query: ({ session }) => permissions.canReadPayments({ session }) || permissions.canManagePayments({ session }),
      create: () => false,
      update: () => false,
      delete: () => false,
    },
    filter: { query: paymentOwnerFilter },
  },
  ui: { isHidden: ({ session }) => !canSeePayments({ session }), hideCreate: true },
  fields: {
    idempotencyKey: text({ validation: { isRequired: true }, isIndexed: "unique" }),
    amount: integer({ validation: { isRequired: true, min: 1 } }),
    currencyCode: text({ validation: { isRequired: true } }),
    status: select({
      type: "string",
      options: [
        { label: "Processing", value: "processing" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
        { label: "Unknown", value: "unknown" },
      ],
      defaultValue: "processing",
      validation: { isRequired: true },
    }),
    reason: text({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    providerRefundId: text(),
    providerData: json({ access: { read: () => false } }),
    processedAt: timestamp(),
    payment: relationship({ isFilterable: canFilterRelations, ref: "Payment" }),
    order: relationship({ isFilterable: canFilterRelations, ref: "CommissionInvoice" }),
    requestedBy: relationship({ isFilterable: canFilterRelations, ref: "User" }),
    approvedBy: relationship({ isFilterable: canFilterRelations, ref: "User" }),
    ...trackingFields,
  },
});
