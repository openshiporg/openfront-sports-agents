import { list } from "@keystone-6/core";
import { integer, json, relationship, select, text, timestamp } from "@keystone-6/core/fields";
import { permissions, canFilterRelations } from "../access";
import { trackingFields } from "./trackingFields";

// Adapted from the Restaurant lineage (openfront-comedy-club ManagerApproval): action-bound, independent approver, single use.
export const ManagerApproval = list({
  access: {
    operation: {
      query: ({ session }) =>
        permissions.canApproveActions({ session }) || permissions.canIssueRefunds({ session }) || permissions.canManageCommissions({ session }) || permissions.canManageEndorsements({ session }),
      create: () => false,
      update: () => false,
      delete: () => false,
    },
  },
  fields: {
    actionType: select({
      type: "enum",
      options: [
        { label: "Refund payment", value: "refund_payment" },
        { label: "Exclusivity override", value: "exclusivity_override" },
        { label: "Commission write-off", value: "commission_writeoff" },
      ],
      validation: { isRequired: true },
      isIndexed: true,
    }),
    targetId: text({ validation: { isRequired: true }, isIndexed: true }),
    amountCents: integer(),
    reason: text({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    requestFingerprint: text({ validation: { isRequired: true } }),
    requestPayload: json(),
    status: select({
      type: "enum",
      options: [
        { label: "Requested", value: "requested" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Consumed", value: "consumed" },
      ],
      defaultValue: "requested",
      validation: { isRequired: true },
      isIndexed: true,
      access: { create: () => false, update: () => false },
    }),
    requestedAt: timestamp({ defaultValue: { kind: "now" }, isIndexed: true }),
    decidedAt: timestamp(),
    consumedAt: timestamp(),
    expiresAt: timestamp({ validation: { isRequired: true }, isIndexed: true }),
    consumedEntityType: text(),
    consumedEntityId: text(),
    requestedBy: relationship({ isFilterable: canFilterRelations, ref: "User.requestedApprovals" }),
    approvedBy: relationship({ isFilterable: canFilterRelations, ref: "User.approvedApprovals" }),
    ...trackingFields,
  },
});
