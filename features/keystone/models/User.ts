import { list } from '@keystone-6/core'
import { allOperations, denyAll } from '@keystone-6/core/access'
import { checkbox, password, relationship, text, select } from '@keystone-6/core/fields'

import { rel } from "./domainFields";
import { trackingFields } from "./trackingFields";
import { isSignedIn, permissions, rules } from '../access'
import type { Session } from '../access'

export const User = list({
  access: {
    operation: {
      ...allOperations(isSignedIn),
      create: (args) => {
        // Allow public sign-ups if environment variable is set to true
        if (process.env.PUBLIC_SIGNUPS_ALLOWED === 'true') {
          return true;
        }
        // Otherwise, require canManagePeople permission
        return permissions.canManagePeople(args);
      },
      delete: permissions.canManagePeople,
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople,
    },
  },
  ui: {
    hideCreate: args => !permissions.canManagePeople(args),
    hideDelete: args => !permissions.canManagePeople(args),
    listView: {
      initialColumns: ['name', 'email', 'role'],
    },
    itemView: {
      defaultFieldMode: ({ session, item }) => {
        // canEditOtherPeople can edit other people
        if (session?.data.role?.canEditOtherPeople) return 'edit'

        // edit themselves
        if (session?.itemId === item?.id) return 'edit'

        // else, default all fields to read mode
        return 'read'
      },
    },
  },
  fields: {
    name: text({
      validation: {
        isRequired: true,
      },
    }),
    email: text({
      isFilterable: false,
      isOrderable: false,
      isIndexed: 'unique',
      validation: {
        isRequired: true,
      },
    }),
    password: password({
      access: {
        read: denyAll,
        update: ({ session, item }) =>
          permissions.canManagePeople({ session }) || session?.itemId === item.id,
      },
      validation: { isRequired: true },
    }),
    role: relationship({
      ref: 'Role.assignedTo',
      access: {
        create: permissions.canManagePeople,
        update: permissions.canManagePeople,
      },
      ui: {
        itemView: {
          fieldMode: args => (permissions.canManagePeople(args) ? 'edit' : 'read'),
        },
      },
    }),
    agentCertification_user: rel("AgentCertification.user", true),
    athlete_leadAgent: rel("Athlete.leadAgent", true),
    athlete_supportStaff: rel("Athlete.supportStaff", true),
    athlete_portalUser: rel("Athlete.portalUser", true),
    representationAgreement_agent: rel("RepresentationAgreement.agent", true),
    interaction_user: rel("Interaction.user", true),
    endorsementDeal_owner: rel("EndorsementDeal.owner", true),
    commissionLedgerEntry_payeeUser: rel("CommissionLedgerEntry.payeeUser", true),
    commissionLedgerEntry_preparedBy: rel("CommissionLedgerEntry.preparedBy", true),
    commissionLedgerEntry_approvedBy: rel("CommissionLedgerEntry.approvedBy", true),
    agentSplit_user: rel("AgentSplit.user", true),
    document_uploadedBy: rel("Document.uploadedBy", true),
    task_assignee: rel("Task.assignee", true),
    auditEvent_actor: rel("AuditEvent.actor", true),
    onboardingStatus: select({type:"enum", options:["not_started","in_progress","completed","dismissed"], defaultValue:"not_started"}),
    ...trackingFields,
  },
});
