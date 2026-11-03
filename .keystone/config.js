"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// keystone.ts
var keystone_exports = {};
__export(keystone_exports, {
  default: () => keystone_default2
});
module.exports = __toCommonJS(keystone_exports);

// features/keystone/index.ts
var import_auth = require("@keystone-6/auth");
var import_core16 = require("@keystone-6/core");
var import_config = require("dotenv/config");

// features/keystone/access.ts
var permissionNames = ["canSeeOtherPeople", "canEditOtherPeople", "canManagePeople", "canManageRoles", "canAccessDashboard", "canManageAthletes", "canManageContracts", "canManageEndorsements", "canManageCommissions", "canManageTrust", "canViewAllClients", "canManagePayments", "canReadPayments", "canIssueRefunds", "canReadAudit", "canManageOnboarding"];
var isSignedIn = ({ session }) => Boolean(session);
var permissions = Object.fromEntries(permissionNames.map((name) => [name, ({ session }) => session?.data.role?.[name] ?? false]));
function athleteScope({ session }) {
  if (!session) return false;
  if (session.data.role?.canViewAllClients) return true;
  return { OR: [{ leadAgent: { id: { equals: session.itemId } } }, { supportStaff: { some: { id: { equals: session.itemId } } } }] };
}
var rules = {
  canReadPeople: ({ session }) => !session ? false : session.data.role?.canSeeOtherPeople ? true : { id: { equals: session.itemId } },
  canUpdatePeople: ({ session }) => !session ? false : session.data.role?.canEditOtherPeople ? true : { id: { equals: session.itemId } }
};

// features/keystone/models/User.ts
var import_core2 = require("@keystone-6/core");
var import_access2 = require("@keystone-6/core/access");
var import_fields3 = require("@keystone-6/core/fields");

// features/keystone/models/domainFields.ts
var import_core = require("@keystone-6/core");
var import_fields2 = require("@keystone-6/core/fields");

// features/keystone/models/trackingFields.ts
var import_fields = require("@keystone-6/core/fields");
var trackingFields = {
  createdAt: (0, import_fields.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  }),
  updatedAt: (0, import_fields.timestamp)({
    access: { read: () => true, create: () => false, update: () => false },
    db: { updatedAt: true },
    validation: { isRequired: true },
    defaultValue: { kind: "now" },
    ui: {
      createView: { fieldMode: "hidden" },
      itemView: { fieldMode: "read" }
    }
  })
};

// features/keystone/models/domainFields.ts
var currencyCode = () => (0, import_fields2.text)({ defaultValue: "USD", validation: { isRequired: true, match: { regex: /^[A-Z]{3}$/, explanation: "ISO 4217 currency required" } } });
var cents = () => (0, import_fields2.integer)({ defaultValue: 0, validation: { min: 0 } });
var bps = (value = 0) => (0, import_fields2.integer)({ defaultValue: value, validation: { min: 0, max: 1e4 } });
var state = (values, initial = values[0]) => (0, import_fields2.select)({ type: "enum", options: values.map((value) => ({ label: value.replaceAll("_", " "), value })), defaultValue: initial, access: { create: () => false, update: () => false } });
var rel = (ref, many = false) => (0, import_fields2.relationship)({ ref, many });
function domainList(fields, permission, scope, immutable = false) {
  const manage = permissions[permission];
  const filter = (args) => {
    const result = athleteScope(args);
    return typeof result === "boolean" || !scope ? result : scope === "self" ? result : scope.split(".").reverse().reduce((nested, key) => ({ [key]: nested }), result);
  };
  return (0, import_core.list)({ ...immutable ? { graphql: { omit: { create: true, delete: true } } } : {}, access: { operation: { query: manage, create: immutable ? () => false : manage, update: immutable ? () => false : manage, delete: () => false }, ...scope ? { filter: { query: filter, update: filter } } : {} }, fields: { ...fields, ...trackingFields } });
}

// features/keystone/models/User.ts
var User = (0, import_core2.list)({
  access: {
    operation: {
      ...(0, import_access2.allOperations)(isSignedIn),
      create: (args) => {
        if (process.env.PUBLIC_SIGNUPS_ALLOWED === "true") {
          return true;
        }
        return permissions.canManagePeople(args);
      },
      delete: permissions.canManagePeople
    },
    filter: {
      query: rules.canReadPeople,
      update: rules.canUpdatePeople
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManagePeople(args),
    hideDelete: (args) => !permissions.canManagePeople(args),
    listView: {
      initialColumns: ["name", "email", "role"]
    },
    itemView: {
      defaultFieldMode: ({ session, item }) => {
        if (session?.data.role?.canEditOtherPeople) return "edit";
        if (session?.itemId === item?.id) return "edit";
        return "read";
      }
    }
  },
  fields: {
    name: (0, import_fields3.text)({
      validation: {
        isRequired: true
      }
    }),
    email: (0, import_fields3.text)({
      isFilterable: false,
      isOrderable: false,
      isIndexed: "unique",
      validation: {
        isRequired: true
      }
    }),
    password: (0, import_fields3.password)({
      access: {
        read: import_access2.denyAll,
        update: ({ session, item }) => permissions.canManagePeople({ session }) || session?.itemId === item.id
      },
      validation: { isRequired: true }
    }),
    role: (0, import_fields3.relationship)({
      ref: "Role.assignedTo",
      access: {
        create: permissions.canManagePeople,
        update: permissions.canManagePeople
      },
      ui: {
        itemView: {
          fieldMode: (args) => permissions.canManagePeople(args) ? "edit" : "read"
        }
      }
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
    onboardingStatus: (0, import_fields3.select)({ type: "enum", options: ["not_started", "in_progress", "completed", "dismissed"], defaultValue: "not_started" }),
    ...trackingFields
  }
});

// features/keystone/models/Role.ts
var import_core3 = require("@keystone-6/core");
var import_access4 = require("@keystone-6/core/access");
var import_fields4 = require("@keystone-6/core/fields");
var Role = (0, import_core3.list)({
  access: {
    operation: {
      ...(0, import_access4.allOperations)(permissions.canManageRoles),
      query: isSignedIn
    }
  },
  ui: {
    hideCreate: (args) => !permissions.canManageRoles(args),
    hideDelete: (args) => !permissions.canManageRoles(args),
    listView: {
      initialColumns: ["name", "assignedTo"]
    },
    itemView: {
      defaultFieldMode: (args) => permissions.canManageRoles(args) ? "edit" : "read"
    }
  },
  fields: {
    ...trackingFields,
    name: (0, import_fields4.text)({ validation: { isRequired: true } }),
    ...Object.fromEntries(permissionNames.map((name) => [name, (0, import_fields4.checkbox)({ defaultValue: false })])),
    assignedTo: (0, import_fields4.relationship)({
      ref: "User.role",
      many: true,
      ui: {
        itemView: { fieldMode: "read" }
      }
    })
  }
});

// features/keystone/models/OAuthApp.ts
var import_core4 = require("@keystone-6/core");
var import_fields5 = require("@keystone-6/core/fields");

// features/keystone/mcp-oauth/core.ts
var import_node_crypto = __toESM(require("node:crypto"));
var MCP_SCOPES = ["mcp:read", "mcp:write"];
var MCP_ACCESS_PREFIX = "mcp_at_";
var ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
var REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1e3;
var AUTHORIZATION_CODE_TTL_MS = 5 * 60 * 1e3;
var CONSENT_TICKET_TTL_MS = 10 * 60 * 1e3;
var DEVELOPMENT_SECRET = "this secret should only be used in testing";
function secret() {
  return process.env.SESSION_SECRET || DEVELOPMENT_SECRET;
}
function randomToken(prefix, bytes = 32) {
  return `${prefix}${import_node_crypto.default.randomBytes(bytes).toString("base64url")}`;
}
function digestToken(token, purpose = "mcp-oauth-token") {
  return import_node_crypto.default.createHmac("sha256", secret()).update(`${purpose}\0${token}`, "utf8").digest("hex");
}
function bearerToken(header) {
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== "string") return null;
  const match = /^Bearer\s+(\S+)\s*$/i.exec(value);
  return match ? match[1] : null;
}
function isMcpAccessToken(token) {
  return typeof token === "string" && token.startsWith(MCP_ACCESS_PREFIX) && token.length > MCP_ACCESS_PREFIX.length;
}
function storedScopes(value) {
  return Array.isArray(value) ? MCP_SCOPES.filter((scope) => value.includes(scope)) : [];
}

// features/keystone/models/OAuthApp.ts
var OAuthApp = (0, import_core4.list)({
  access: {
    operation: {
      query: permissions.canManagePeople,
      create: permissions.canManagePeople,
      update: permissions.canManagePeople,
      delete: permissions.canManagePeople
    }
  },
  fields: {
    name: (0, import_fields5.text)({
      validation: {
        isRequired: true
      }
    }),
    clientId: (0, import_fields5.text)({
      isIndexed: "unique",
      hooks: {
        resolveInput: ({ operation, resolvedData }) => {
          if (operation === "create" && !resolvedData.clientId) {
            return randomToken("mcp_cl_", 18);
          }
          return resolvedData.clientId;
        }
      },
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
        description: "Auto-generated unique identifier for your application."
      }
    }),
    clientSecret: (0, import_fields5.text)({
      access: {
        read: () => false
      },
      hooks: {
        resolveInput: ({ resolvedData }) => {
          if (resolvedData.clientSecret) {
            return digestToken(resolvedData.clientSecret, "oauth-client-secret");
          }
          return void 0;
        }
      },
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "hidden" },
        description: "Stored only as a digest. Public MCP clients have no secret."
      }
    }),
    tokenEndpointAuthMethod: (0, import_fields5.select)({
      options: [
        { label: "Client secret (POST)", value: "client_secret_post" },
        { label: "Client secret (Basic)", value: "client_secret_basic" },
        { label: "None (public PKCE client)", value: "none" }
      ],
      defaultValue: "client_secret_post",
      ui: {
        description: "How the app authenticates at the token endpoint. MCP clients are public (none)."
      }
    }),
    redirectUris: (0, import_fields5.json)({
      defaultValue: [],
      ui: {
        description: "Array of allowed redirect URIs for OAuth callbacks"
      }
    }),
    scopes: (0, import_fields5.json)({
      defaultValue: [...MCP_SCOPES],
      ui: {
        description: "Array of allowed OAuth scopes. MCP scopes only narrow the signed-in user's own access."
      }
    }),
    webhookUrl: (0, import_fields5.text)({
      ui: {
        description: "URL to receive webhook notifications"
      }
    }),
    status: (0, import_fields5.select)({
      options: [
        { label: "Active", value: "active" },
        { label: "Suspended", value: "suspended" },
        { label: "Pending", value: "pending" }
      ],
      defaultValue: "active"
    }),
    installUrl: (0, import_fields5.text)({
      ui: {
        description: "URL where users can install this app"
      }
    }),
    uninstallUrl: (0, import_fields5.text)({
      ui: {
        description: "URL to handle app uninstallation"
      }
    }),
    description: (0, import_fields5.text)({
      ui: {
        displayMode: "textarea"
      }
    }),
    metadata: (0, import_fields5.json)({
      defaultValue: {},
      ui: {
        description: "Additional app-specific configuration and settings"
      }
    }),
    developerEmail: (0, import_fields5.text)(),
    privacyPolicyUrl: (0, import_fields5.text)(),
    termsOfServiceUrl: (0, import_fields5.text)(),
    supportUrl: (0, import_fields5.text)(),
    ...trackingFields
  },
  ui: {
    labelField: "name",
    listView: {
      initialColumns: ["name", "clientId", "status", "createdAt"]
    }
  }
});

// features/keystone/models/OAuthToken.ts
var import_core6 = require("@keystone-6/core");
var import_fields6 = require("@keystone-6/core/fields");
var digestTokenInput = {
  resolveInput: ({ resolvedData, fieldKey }) => resolvedData[fieldKey] ? digestToken(resolvedData[fieldKey]) : resolvedData[fieldKey]
};
var OAuthToken = (0, import_core6.list)({
  access: {
    operation: {
      query: permissions.canManagePeople,
      create: permissions.canManagePeople,
      update: permissions.canManagePeople,
      delete: permissions.canManagePeople
    }
  },
  fields: {
    tokenType: (0, import_fields6.select)({
      options: [
        { label: "Authorization Code", value: "authorization_code" },
        { label: "Access Token", value: "access_token" },
        { label: "Refresh Token", value: "refresh_token" }
      ],
      validation: {
        isRequired: true
      }
    }),
    token: (0, import_fields6.text)({
      access: { read: () => false },
      validation: {
        isRequired: true
      },
      isIndexed: "unique",
      hooks: digestTokenInput
    }),
    clientId: (0, import_fields6.text)({
      validation: {
        isRequired: true
      },
      isIndexed: true
    }),
    user: (0, import_fields6.relationship)({
      ref: "User",
      ui: {
        description: "The user who authorized this token"
      }
    }),
    scopes: (0, import_fields6.json)({
      defaultValue: [],
      ui: {
        description: "Array of granted scopes"
      }
    }),
    redirectUri: (0, import_fields6.text)({
      ui: {
        description: "The redirect URI used during authorization"
      }
    }),
    resource: (0, import_fields6.text)({
      ui: {
        description: "The MCP endpoint (RFC 8707 resource) this grant is for"
      }
    }),
    expiresAt: (0, import_fields6.timestamp)({
      ui: {
        description: "When this token expires"
      }
    }),
    isRevoked: (0, import_fields6.select)({
      options: [
        { label: "Active", value: "false" },
        { label: "Revoked", value: "true" }
      ],
      defaultValue: "false"
    }),
    authorizationCode: (0, import_fields6.text)({
      access: { read: () => false },
      hooks: digestTokenInput,
      ui: {
        description: "The authorization code that was exchanged for this token (for access tokens)"
      }
    }),
    refreshToken: (0, import_fields6.text)({
      access: { read: () => false },
      hooks: digestTokenInput,
      ui: {
        description: "Associated refresh token (for access tokens)"
      }
    }),
    accessToken: (0, import_fields6.text)({
      access: { read: () => false },
      hooks: digestTokenInput,
      ui: {
        description: "Associated access token (for refresh tokens)"
      }
    }),
    state: (0, import_fields6.text)({
      ui: {
        description: "OAuth state parameter for CSRF protection"
      }
    }),
    codeChallenge: (0, import_fields6.text)({
      ui: {
        description: "PKCE code challenge"
      }
    }),
    codeChallengeMethod: (0, import_fields6.select)({
      options: [
        { label: "Plain", value: "plain" },
        { label: "SHA256", value: "S256" }
      ],
      ui: {
        description: "PKCE code challenge method"
      }
    }),
    ...trackingFields
  },
  ui: {
    labelField: "clientId",
    listView: {
      initialColumns: ["tokenType", "clientId", "user", "scopes", "expiresAt", "isRevoked"]
    }
  }
});

// features/keystone/models/Agency.ts
var import_fields7 = require("@keystone-6/core/fields");
var Agency = domainList({
  name: (0, import_fields7.text)({ validation: { isRequired: true } }),
  defaultPlayingCommissionBps: bps(300),
  defaultEndorsementCommissionBps: bps(1500),
  currencyCode: currencyCode(),
  fiscalYearStart: (0, import_fields7.integer)({ defaultValue: 1, validation: { min: 1, max: 12 } }),
  refundApprovalThresholdCents: cents()
}, "canManageOnboarding", void 0, false);

// features/keystone/models/AgentCertification.ts
var import_fields8 = require("@keystone-6/core/fields");
var AgentCertification = domainList({
  user: rel("User.agentCertification_user", false),
  body: state(["NFLPA", "NBPA", "MLBPA", "NHLPA", "MLSPA", "FIFA", "NCAA_NIL_STATE", "other"]),
  number: (0, import_fields8.text)({ validation: { isRequired: true } }),
  issuedAt: (0, import_fields8.timestamp)(),
  expiresAt: (0, import_fields8.timestamp)(),
  status: state(["active", "expired", "suspended"]),
  document: rel("Document.agentCertification_document", false)
}, "canManageContracts", void 0, false);

// features/keystone/models/Team.ts
var import_fields9 = require("@keystone-6/core/fields");
var Team = domainList({
  name: (0, import_fields9.text)({ validation: { isRequired: true } }),
  league: (0, import_fields9.text)(),
  city: (0, import_fields9.text)(),
  athlete_team: rel("Athlete.team", true),
  playingContract_team: rel("PlayingContract.team", true)
}, "canManageAthletes", void 0, false);

// features/keystone/models/Athlete.ts
var import_fields10 = require("@keystone-6/core/fields");
var Athlete = domainList({
  fullName: (0, import_fields10.text)({ validation: { isRequired: true } }),
  preferredName: (0, import_fields10.text)(),
  sport: (0, import_fields10.text)(),
  league: state(["NFL", "NBA", "WNBA", "MLB", "NHL", "MLS", "NWSL", "NCAA", "Other"]),
  position: (0, import_fields10.text)(),
  team: rel("Team.athlete_team", false),
  dateOfBirth: (0, import_fields10.calendarDay)(),
  status: state(["prospect", "recruiting", "client", "former", "lost"]),
  leadAgent: rel("User.athlete_leadAgent", false),
  supportStaff: rel("User.athlete_supportStaff", true),
  portalUser: rel("User.athlete_portalUser", false),
  email: (0, import_fields10.text)(),
  phone: (0, import_fields10.text)(),
  representationStartedAt: (0, import_fields10.timestamp)(),
  socialHandles: (0, import_fields10.json)(),
  followerCounts: (0, import_fields10.json)(),
  marketabilityNotes: (0, import_fields10.text)(),
  image: (0, import_fields10.text)(),
  eligibility: (0, import_fields10.json)(),
  isPublic: (0, import_fields10.checkbox)({ defaultValue: false }),
  recruitingStage: state(["identified", "contacted", "meeting", "pitched", "verbal", "signed", "lost"]),
  contactAllowedFrom: (0, import_fields10.timestamp)(),
  representationAgreement_athlete: rel("RepresentationAgreement.athlete", true),
  contact_athletes: rel("Contact.athletes", true),
  interaction_athlete: rel("Interaction.athlete", true),
  playingContract_athlete: rel("PlayingContract.athlete", true),
  endorsementDeal_athlete: rel("EndorsementDeal.athlete", true),
  scheduledPayment_athlete: rel("ScheduledPayment.athlete", true),
  commissionInvoice_athlete: rel("CommissionInvoice.athlete", true),
  commissionLedgerEntry_athlete: rel("CommissionLedgerEntry.athlete", true),
  agentSplit_athlete: rel("AgentSplit.athlete", true),
  clientTrustAccount_athlete: rel("ClientTrustAccount.athlete", true),
  clientTrustEntry_athlete: rel("ClientTrustEntry.athlete", true),
  document_athlete: rel("Document.athlete", true),
  task_athlete: rel("Task.athlete", true)
}, "canManageAthletes", "self", false);

// features/keystone/models/RepresentationAgreement.ts
var import_fields11 = require("@keystone-6/core/fields");
var RepresentationAgreement = domainList({
  athlete: rel("Athlete.representationAgreement_athlete", false),
  agent: rel("User.representationAgreement_agent", false),
  scope: state(["playing", "marketing", "both"]),
  playingCommissionBps: bps(300),
  marketingCommissionBps: bps(1500),
  capBps: bps(300),
  effectiveAt: (0, import_fields11.timestamp)(),
  expiresAt: (0, import_fields11.timestamp)(),
  terminationNoticeDays: (0, import_fields11.integer)({ defaultValue: 30, validation: { min: 0 } }),
  status: state(["draft", "sent", "signed", "filed_with_union", "active", "terminated", "expired"]),
  signedDocument: rel("Document.representationAgreement_signedDocument", false),
  filedAt: (0, import_fields11.timestamp)(),
  playingContract_representationAgreement: rel("PlayingContract.representationAgreement", true),
  document_agreement: rel("Document.agreement", true)
}, "canManageContracts", "athlete", false);

// features/keystone/models/Contact.ts
var import_fields12 = require("@keystone-6/core/fields");
var Contact = domainList({
  name: (0, import_fields12.text)({ validation: { isRequired: true } }),
  org: (0, import_fields12.text)(),
  role: (0, import_fields12.text)(),
  email: (0, import_fields12.text)(),
  phone: (0, import_fields12.text)(),
  athletes: rel("Athlete.contact_athletes", true),
  doNotContact: (0, import_fields12.checkbox)({ defaultValue: false }),
  brand_contacts: rel("Brand.contacts", true),
  interaction_contact: rel("Interaction.contact", true)
}, "canManageAthletes", void 0, false);

// features/keystone/models/Brand.ts
var import_fields13 = require("@keystone-6/core/fields");
var Brand = domainList({
  name: (0, import_fields13.text)({ validation: { isRequired: true } }),
  category: (0, import_fields13.text)(),
  contacts: rel("Contact.brand_contacts", true),
  website: (0, import_fields13.text)(),
  interaction_brand: rel("Interaction.brand", true),
  endorsementDeal_brand: rel("EndorsementDeal.brand", true)
}, "canManageEndorsements", void 0, false);

// features/keystone/models/Interaction.ts
var import_fields14 = require("@keystone-6/core/fields");
var Interaction = domainList({
  athlete: rel("Athlete.interaction_athlete", false),
  contact: rel("Contact.interaction_contact", false),
  brand: rel("Brand.interaction_brand", false),
  user: rel("User.interaction_user", false),
  kind: state(["call", "meeting", "email", "text", "visit", "note"]),
  occurredAt: (0, import_fields14.timestamp)(),
  summary: (0, import_fields14.text)({ validation: { isRequired: true } }),
  nextStepAt: (0, import_fields14.timestamp)()
}, "canManageAthletes", "athlete", false);

// features/keystone/models/PlayingContract.ts
var import_fields15 = require("@keystone-6/core/fields");
var PlayingContract = domainList({
  athlete: rel("Athlete.playingContract_athlete", false),
  team: rel("Team.playingContract_team", false),
  league: (0, import_fields15.text)(),
  contractType: state(["rookie_scale", "veteran", "extension", "two_way", "minor_league", "college_nil", "other"]),
  signedAt: (0, import_fields15.timestamp)(),
  startSeason: (0, import_fields15.text)(),
  endSeason: (0, import_fields15.text)(),
  totalValueCents: cents(),
  guaranteedCents: cents(),
  signingBonusCents: cents(),
  status: state(["negotiating", "signed", "active", "completed", "terminated", "released"]),
  document: rel("Document.playingContract_document", false),
  commissionBps: bps(0),
  representationAgreement: rel("RepresentationAgreement.playingContract_representationAgreement", false),
  currencyCode: currencyCode(),
  contractYear_contract: rel("ContractYear.contract", true),
  incentive_contract: rel("Incentive.contract", true),
  document_contract: rel("Document.contract", true),
  task_contract: rel("Task.contract", true)
}, "canManageContracts", "athlete", false);

// features/keystone/models/ContractYear.ts
var import_fields16 = require("@keystone-6/core/fields");
var ContractYear = domainList({
  contract: rel("PlayingContract.contractYear_contract", false),
  season: (0, import_fields16.text)({ validation: { isRequired: true } }),
  baseSalaryCents: cents(),
  guaranteedCents: cents(),
  rosterBonusCents: cents(),
  workoutBonusCents: cents(),
  payPeriods: (0, import_fields16.integer)({ defaultValue: 17, validation: { min: 1, max: 366 } }),
  paySchedule: state(["game_checks", "semi_monthly", "lump_sum"]),
  currencyCode: currencyCode(),
  scheduledPayment_contractYear: rel("ScheduledPayment.contractYear", true)
}, "canManageContracts", "contract.athlete", false);

// features/keystone/models/Incentive.ts
var import_fields17 = require("@keystone-6/core/fields");
var Incentive = domainList({
  contract: rel("PlayingContract.incentive_contract", false),
  description: (0, import_fields17.text)({ validation: { isRequired: true } }),
  amountCents: cents(),
  likelyToBeEarned: (0, import_fields17.checkbox)(),
  status: state(["pending", "earned", "not_earned"]),
  earnedAt: (0, import_fields17.timestamp)(),
  evidence: (0, import_fields17.text)(),
  currencyCode: currencyCode(),
  scheduledPayment_incentive: rel("ScheduledPayment.incentive", true)
}, "canManageContracts", "contract.athlete", false);

// features/keystone/models/EndorsementDeal.ts
var import_fields18 = require("@keystone-6/core/fields");
var EndorsementDeal = domainList({
  athlete: rel("Athlete.endorsementDeal_athlete", false),
  brand: rel("Brand.endorsementDeal_brand", false),
  owner: rel("User.endorsementDeal_owner", false),
  status: state(["prospect", "negotiating", "signed", "active", "completed", "terminated"]),
  termStart: (0, import_fields18.timestamp)(),
  termEnd: (0, import_fields18.timestamp)(),
  totalValueCents: cents(),
  commissionBps: bps(1500),
  exclusivityCategory: (0, import_fields18.text)(),
  territory: (0, import_fields18.text)(),
  document: rel("Document.endorsementDeal_document", false),
  paymentTerms: (0, import_fields18.text)(),
  currencyCode: currencyCode(),
  deliverable_deal: rel("Deliverable.deal", true),
  scheduledPayment_endorsementDeal: rel("ScheduledPayment.endorsementDeal", true),
  agentSplit_deal: rel("AgentSplit.deal", true),
  document_deal: rel("Document.deal", true),
  task_deal: rel("Task.deal", true)
}, "canManageEndorsements", "athlete", false);

// features/keystone/models/Deliverable.ts
var import_fields19 = require("@keystone-6/core/fields");
var Deliverable = domainList({
  deal: rel("EndorsementDeal.deliverable_deal", false),
  kind: state(["social_post", "appearance", "photo_shoot", "commercial", "autograph_session", "other"]),
  dueAt: (0, import_fields19.timestamp)(),
  status: state(["scheduled", "completed", "missed", "waived"]),
  completedAt: (0, import_fields19.timestamp)(),
  proofLink: (0, import_fields19.text)(),
  proof: rel("Document.deliverable_proof", false),
  notes: (0, import_fields19.text)()
}, "canManageEndorsements", "deal.athlete", false);

// features/keystone/models/ScheduledPayment.ts
var import_fields20 = require("@keystone-6/core/fields");
var ScheduledPayment = domainList({
  sourceKey: (0, import_fields20.text)({ isIndexed: "unique", validation: { isRequired: true } }),
  contractYear: rel("ContractYear.scheduledPayment_contractYear", false),
  endorsementDeal: rel("EndorsementDeal.scheduledPayment_endorsementDeal", false),
  incentive: rel("Incentive.scheduledPayment_incentive", false),
  athlete: rel("Athlete.scheduledPayment_athlete", false),
  dueAt: (0, import_fields20.timestamp)(),
  grossCents: cents(),
  commissionBps: bps(0),
  commissionCents: cents(),
  remainder: (0, import_fields20.integer)({ defaultValue: 0 }),
  receivedAt: (0, import_fields20.timestamp)(),
  status: state(["scheduled", "received", "late", "waived"]),
  currencyCode: currencyCode(),
  invoice: rel("CommissionInvoice.scheduledPayment_invoice", false),
  commissionInvoiceLine_scheduledPayment: rel("CommissionInvoiceLine.scheduledPayment", true),
  commissionLedgerEntry_scheduledPayment: rel("CommissionLedgerEntry.scheduledPayment", true)
}, "canManageCommissions", "athlete", true);

// features/keystone/models/CommissionInvoice.ts
var import_fields21 = require("@keystone-6/core/fields");
var CommissionInvoice = domainList({
  payment_order: rel("Payment.order", true),
  athlete: rel("Athlete.commissionInvoice_athlete", false),
  number: (0, import_fields21.text)({ isIndexed: "unique", validation: { isRequired: true } }),
  issuedAt: (0, import_fields21.timestamp)(),
  dueAt: (0, import_fields21.timestamp)(),
  totalCents: cents(),
  paidCents: cents(),
  status: state(["draft", "sent", "partially_paid", "paid", "void", "written_off"]),
  paymentCollection: rel("PaymentCollection.invoice", false),
  currencyCode: currencyCode(),
  scheduledPayment_invoice: rel("ScheduledPayment.invoice", true),
  commissionInvoiceLine_invoice: rel("CommissionInvoiceLine.invoice", true),
  commissionLedgerEntry_invoice: rel("CommissionLedgerEntry.invoice", true),
  clientTrustEntry_invoice: rel("ClientTrustEntry.invoice", true)
}, "canManageCommissions", "athlete", true);

// features/keystone/models/CommissionInvoiceLine.ts
var import_fields22 = require("@keystone-6/core/fields");
var CommissionInvoiceLine = domainList({
  invoice: rel("CommissionInvoice.commissionInvoiceLine_invoice", false),
  scheduledPayment: rel("ScheduledPayment.commissionInvoiceLine_scheduledPayment", false),
  description: (0, import_fields22.text)({ validation: { isRequired: true } }),
  grossCents: cents(),
  commissionBps: bps(0),
  commissionCents: cents(),
  quantity: (0, import_fields22.integer)({ defaultValue: 1 }),
  unitPriceCents: cents(),
  feesCents: cents(),
  taxCents: cents(),
  currencyCode: currencyCode()
}, "canManageCommissions", "invoice.athlete", true);

// features/keystone/models/CommissionLedgerEntry.ts
var import_fields23 = require("@keystone-6/core/fields");
var CommissionLedgerEntry = domainList({
  entryKey: (0, import_fields23.text)({ isIndexed: "unique", validation: { isRequired: true } }),
  athlete: rel("Athlete.commissionLedgerEntry_athlete", false),
  invoice: rel("CommissionInvoice.commissionLedgerEntry_invoice", false),
  scheduledPayment: rel("ScheduledPayment.commissionLedgerEntry_scheduledPayment", false),
  entryType: state(["accrual", "invoice", "receipt", "split_to_agent", "reversal", "write_off"]),
  amountCents: (0, import_fields23.bigInt)({ validation: { isRequired: true } }),
  payeeUser: rel("User.commissionLedgerEntry_payeeUser", false),
  reverses: rel("CommissionLedgerEntry.commissionLedgerEntry_reverses", false),
  reversalKey: (0, import_fields23.text)({ isIndexed: "unique", db: { isNullable: true } }),
  reason: (0, import_fields23.text)({ validation: { isRequired: true } }),
  preparedBy: rel("User.commissionLedgerEntry_preparedBy", false),
  approvedBy: rel("User.commissionLedgerEntry_approvedBy", false),
  occurredAt: (0, import_fields23.timestamp)(),
  currencyCode: currencyCode(),
  commissionLedgerEntry_reverses: rel("CommissionLedgerEntry.reverses", true)
}, "canManageCommissions", "athlete", true);

// features/keystone/models/AgentSplit.ts
var AgentSplit = domainList({
  athlete: rel("Athlete.agentSplit_athlete", false),
  deal: rel("EndorsementDeal.agentSplit_deal", false),
  user: rel("User.agentSplit_user", false),
  shareBps: bps(0)
}, "canManageCommissions", "athlete", true);

// features/keystone/models/ClientTrustAccount.ts
var import_fields24 = require("@keystone-6/core/fields");
var ClientTrustAccount = domainList({
  athlete: rel("Athlete.clientTrustAccount_athlete", false),
  name: (0, import_fields24.text)({ validation: { isRequired: true } }),
  currencyCode: currencyCode(),
  clientTrustEntry_account: rel("ClientTrustEntry.account", true)
}, "canManageTrust", "athlete", false);

// features/keystone/models/ClientTrustEntry.ts
var import_fields25 = require("@keystone-6/core/fields");
var ClientTrustEntry = domainList({
  account: rel("ClientTrustAccount.clientTrustEntry_account", false),
  athlete: rel("Athlete.clientTrustEntry_athlete", false),
  invoice: rel("CommissionInvoice.clientTrustEntry_invoice", false),
  entryType: state(["deposit", "commission_transfer", "disbursement_to_client", "reversal"]),
  amountCents: (0, import_fields25.bigInt)({ validation: { isRequired: true } }),
  reference: (0, import_fields25.text)({ validation: { isRequired: true } }),
  occurredAt: (0, import_fields25.timestamp)(),
  reverses: rel("ClientTrustEntry.clientTrustEntry_reverses", false),
  reversalKey: (0, import_fields25.text)({ isIndexed: "unique", db: { isNullable: true } }),
  currencyCode: currencyCode(),
  clientTrustEntry_reverses: rel("ClientTrustEntry.reverses", true)
}, "canManageTrust", "athlete", true);

// features/keystone/models/Document.ts
var import_fields26 = require("@keystone-6/core/fields");
var Document = domainList({
  athlete: rel("Athlete.document_athlete", false),
  contract: rel("PlayingContract.document_contract", false),
  deal: rel("EndorsementDeal.document_deal", false),
  agreement: rel("RepresentationAgreement.document_agreement", false),
  kind: (0, import_fields26.text)({ validation: { isRequired: true } }),
  version: (0, import_fields26.integer)({ defaultValue: 1, validation: { min: 1 } }),
  sha256: (0, import_fields26.text)({ validation: { isRequired: true } }),
  storageKey: (0, import_fields26.text)({ access: { read: () => false } }),
  uploadedBy: rel("User.document_uploadedBy", false),
  verifiedAt: (0, import_fields26.timestamp)(),
  agentCertification_document: rel("AgentCertification.document", true),
  representationAgreement_signedDocument: rel("RepresentationAgreement.signedDocument", true),
  playingContract_document: rel("PlayingContract.document", true),
  endorsementDeal_document: rel("EndorsementDeal.document", true),
  deliverable_proof: rel("Deliverable.proof", true)
}, "canManageAthletes", "athlete", true);

// features/keystone/models/Task.ts
var import_fields27 = require("@keystone-6/core/fields");
var Task = domainList({
  title: (0, import_fields27.text)({ validation: { isRequired: true } }),
  athlete: rel("Athlete.task_athlete", false),
  deal: rel("EndorsementDeal.task_deal", false),
  contract: rel("PlayingContract.task_contract", false),
  assignee: rel("User.task_assignee", false),
  dueAt: (0, import_fields27.timestamp)(),
  status: state(["open", "in_progress", "completed", "cancelled"]),
  priority: state(["normal", "high", "urgent"]),
  autoKey: (0, import_fields27.text)({ isIndexed: "unique", db: { isNullable: true } })
}, "canManageAthletes", "athlete", false);

// features/keystone/models/AuditEvent.ts
var import_fields28 = require("@keystone-6/core/fields");
var AuditEvent = domainList({
  actor: rel("User.auditEvent_actor", false),
  action: (0, import_fields28.text)({ validation: { isRequired: true } }),
  targetList: (0, import_fields28.text)({ validation: { isRequired: true } }),
  targetId: (0, import_fields28.text)({ validation: { isRequired: true } }),
  before: (0, import_fields28.json)(),
  after: (0, import_fields28.json)(),
  reason: (0, import_fields28.text)(),
  requestId: (0, import_fields28.text)({ isIndexed: true })
}, "canReadAudit", void 0, true);

// features/keystone/models/PaymentProvider.ts
var import_core8 = require("@keystone-6/core");
var import_fields29 = require("@keystone-6/core/fields");
var canConfigureProvider = (args) => isSignedIn(args) && permissions.canManagePayments(args);
var PaymentProvider = (0, import_core8.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canReadPayments({ session }) || permissions.canManagePayments({ session }),
      create: canConfigureProvider,
      update: canConfigureProvider,
      delete: canConfigureProvider
    }
  },
  ui: {
    listView: {
      initialColumns: ["name", "code", "isInstalled"]
    }
  },
  fields: {
    name: (0, import_fields29.text)({
      validation: { isRequired: true }
    }),
    code: (0, import_fields29.text)({
      isIndexed: "unique",
      validation: {
        isRequired: true,
        match: {
          regex: /^pp_[a-zA-Z0-9-_]+$/,
          explanation: 'Payment provider code must start with "pp_" followed by alphanumeric characters, hyphens or underscores'
        }
      }
    }),
    isInstalled: (0, import_fields29.checkbox)({
      defaultValue: true
    }),
    credentials: (0, import_fields29.json)({
      access: { read: () => false, create: canConfigureProvider, update: canConfigureProvider },
      defaultValue: {}
    }),
    metadata: (0, import_fields29.json)({
      defaultValue: {}
    }),
    createPaymentFunction: (0, import_fields29.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to create payments"
      }
    }),
    capturePaymentFunction: (0, import_fields29.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to capture payments"
      }
    }),
    refundPaymentFunction: (0, import_fields29.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to refund payments"
      }
    }),
    getPaymentStatusFunction: (0, import_fields29.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to check payment status"
      }
    }),
    generatePaymentLinkFunction: (0, import_fields29.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to generate payment dashboard links"
      }
    }),
    handleWebhookFunction: (0, import_fields29.text)({
      validation: { isRequired: true },
      ui: {
        description: "Name of the adapter function to handle provider webhooks"
      }
    }),
    sessions: (0, import_fields29.relationship)({
      ref: "PaymentSession.paymentProvider",
      many: true
    }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentCollection.ts
var import_core9 = require("@keystone-6/core");
var import_fields30 = require("@keystone-6/core/fields");
var PaymentCollection = (0, import_core9.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canManageCommissions({ session }),
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  fields: {
    description: (0, import_fields30.select)({
      type: "enum",
      options: [
        { label: "Default", value: "default" },
        { label: "Refund", value: "refund" }
      ],
      defaultValue: "default"
    }),
    amount: (0, import_fields30.integer)({
      validation: { isRequired: true }
    }),
    authorizedAmount: (0, import_fields30.integer)({
      defaultValue: 0
    }),
    refundedAmount: (0, import_fields30.integer)({
      defaultValue: 0
    }),
    metadata: (0, import_fields30.json)(),
    paymentSessions: (0, import_fields30.relationship)({
      ref: "PaymentSession.paymentCollection",
      many: true
    }),
    payments: (0, import_fields30.relationship)({
      ref: "Payment.paymentCollection",
      many: true
    }),
    invoice: (0, import_fields30.relationship)({
      ref: "CommissionInvoice.paymentCollection"
    }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentSession.ts
var import_core10 = require("@keystone-6/core");
var import_fields31 = require("@keystone-6/core/fields");
var PaymentSession = (0, import_core10.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canManageCommissions({ session }),
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  fields: {
    isSelected: (0, import_fields31.checkbox)({
      defaultValue: false
    }),
    isInitiated: (0, import_fields31.checkbox)({
      defaultValue: false
    }),
    amount: (0, import_fields31.integer)({
      validation: { isRequired: true }
    }),
    data: (0, import_fields31.json)({
      defaultValue: {}
    }),
    idempotencyKey: (0, import_fields31.text)({
      validation: { isRequired: true },
      isIndexed: "unique"
    }),
    paymentCollection: (0, import_fields31.relationship)({
      ref: "PaymentCollection.paymentSessions"
    }),
    paymentProvider: (0, import_fields31.relationship)({
      ref: "PaymentProvider.sessions",
      many: false
    }),
    paymentAuthorizedAt: (0, import_fields31.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/Payment.ts
var import_core11 = require("@keystone-6/core");
var import_fields32 = require("@keystone-6/core/fields");
var Payment = (0, import_core11.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canReadPayments({ session }) || permissions.canManagePayments({ session }),
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  ui: {
    listView: {
      initialColumns: ["amount", "status", "paymentMethod", "order", "createdAt"]
    }
  },
  fields: {
    idempotencyKey: (0, import_fields32.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    reservedAt: (0, import_fields32.timestamp)(),
    refundedAmount: (0, import_fields32.integer)({ defaultValue: 0, validation: { min: 0 } }),
    amount: (0, import_fields32.integer)({
      validation: { isRequired: true },
      ui: {
        description: "Payment amount in cents"
      }
    }),
    data: (0, import_fields32.json)({
      ui: {
        description: "Payment provider data (clientSecret, paymentIntentId, orderId, etc.)"
      }
    }),
    currencyCode: (0, import_fields32.text)({
      defaultValue: "USD",
      ui: { description: "ISO 4217 currency code for this payment" }
    }),
    status: (0, import_fields32.select)({
      type: "string",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Processing", value: "processing" },
        { label: "Authorized", value: "authorized" },
        { label: "Unknown", value: "unknown" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
        { label: "Cancelled", value: "cancelled" },
        { label: "Refunded", value: "refunded" },
        { label: "Partially Refunded", value: "partially_refunded" }
      ],
      defaultValue: "pending",
      validation: { isRequired: true }
    }),
    paymentMethod: (0, import_fields32.select)({
      type: "string",
      options: [
        { label: "Credit Card", value: "credit_card" },
        { label: "Debit Card", value: "debit_card" },
        { label: "Cash", value: "cash" },
        { label: "Gift Card", value: "gift_card" },
        { label: "PayPal", value: "paypal" },
        { label: "Apple Pay", value: "apple_pay" },
        { label: "Google Pay", value: "google_pay" }
      ],
      defaultValue: "credit_card"
    }),
    paymentProvider: (0, import_fields32.relationship)({
      ref: "PaymentProvider",
      ui: {
        displayMode: "select",
        description: "Optional provider backing this payment"
      }
    }),
    providerPaymentId: (0, import_fields32.text)({
      ui: {
        description: "Provider payment identifier (Stripe/PayPal/etc.)"
      }
    }),
    // Card details (last 4 digits for reference)
    cardLast4: (0, import_fields32.text)({
      ui: {
        description: "Last 4 digits of card"
      }
    }),
    cardBrand: (0, import_fields32.text)({
      ui: {
        description: "Card brand (visa, mastercard, etc.)"
      }
    }),
    // Tip handling
    tipAmount: (0, import_fields32.integer)({
      defaultValue: 0,
      ui: {
        description: "Tip amount included in payment in cents"
      }
    }),
    // Split payment support
    isSplitPayment: (0, import_fields32.checkbox)({
      defaultValue: false,
      ui: {
        description: "Whether this payment is part of a split bill"
      }
    }),
    splitPaymentIndex: (0, import_fields32.integer)({
      ui: {
        description: "Index of this payment in split (1, 2, 3, etc.)"
      }
    }),
    splitTotal: (0, import_fields32.integer)({
      ui: {
        description: "Total number of split payments for this order"
      }
    }),
    processedAt: (0, import_fields32.timestamp)({
      ui: {
        description: "When payment was successfully processed"
      }
    }),
    // Metadata for errors or additional info
    errorMessage: (0, import_fields32.text)({
      ui: {
        description: "Error message if payment failed"
      }
    }),
    notes: (0, import_fields32.text)({
      ui: {
        displayMode: "textarea",
        description: "Internal notes about this payment"
      }
    }),
    // Relationships
    order: (0, import_fields32.relationship)({
      ref: "CommissionInvoice.payment_order",
      ui: {
        displayMode: "select"
      }
    }),
    paymentCollection: (0, import_fields32.relationship)({
      ref: "PaymentCollection.payments",
      ui: {
        displayMode: "select",
        description: "Payment collection this payment belongs to"
      }
    }),
    processedBy: (0, import_fields32.relationship)({
      ref: "User",
      ui: {
        displayMode: "select",
        description: "Staff member who processed payment"
      }
    }),
    ...trackingFields
  }
});

// features/keystone/models/Refund.ts
var import_core12 = require("@keystone-6/core");
var import_fields33 = require("@keystone-6/core/fields");
var Refund = (0, import_core12.list)({
  access: {
    operation: {
      query: ({ session }) => permissions.canReadPayments({ session }) || permissions.canManagePayments({ session }),
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  fields: {
    idempotencyKey: (0, import_fields33.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    amount: (0, import_fields33.integer)({ validation: { isRequired: true, min: 1 } }),
    currencyCode: (0, import_fields33.text)({ validation: { isRequired: true } }),
    status: (0, import_fields33.select)({
      type: "string",
      options: [
        { label: "Processing", value: "processing" },
        { label: "Succeeded", value: "succeeded" },
        { label: "Failed", value: "failed" },
        { label: "Unknown", value: "unknown" }
      ],
      defaultValue: "processing",
      validation: { isRequired: true }
    }),
    reason: (0, import_fields33.text)({ validation: { isRequired: true }, ui: { displayMode: "textarea" } }),
    providerRefundId: (0, import_fields33.text)(),
    providerData: (0, import_fields33.json)(),
    processedAt: (0, import_fields33.timestamp)(),
    payment: (0, import_fields33.relationship)({ ref: "Payment" }),
    order: (0, import_fields33.relationship)({ ref: "CommissionInvoice" }),
    requestedBy: (0, import_fields33.relationship)({ ref: "User" }),
    approvedBy: (0, import_fields33.relationship)({ ref: "User" }),
    ...trackingFields
  }
});

// features/keystone/models/PaymentWebhookEvent.ts
var import_core13 = require("@keystone-6/core");
var import_fields34 = require("@keystone-6/core/fields");
var PaymentWebhookEvent = (0, import_core13.list)({
  access: {
    operation: {
      query: permissions.canManagePayments,
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  fields: {
    eventKey: (0, import_fields34.text)({ validation: { isRequired: true }, isIndexed: "unique" }),
    providerCode: (0, import_fields34.text)({ validation: { isRequired: true }, isIndexed: true }),
    providerEventId: (0, import_fields34.text)({ isIndexed: true }),
    eventType: (0, import_fields34.text)({ isIndexed: true }),
    status: (0, import_fields34.select)({
      type: "string",
      options: [
        { label: "Received", value: "received" },
        { label: "Processed", value: "processed" },
        { label: "Ignored", value: "ignored" },
        { label: "Failed", value: "failed" }
      ],
      defaultValue: "received"
    }),
    payload: (0, import_fields34.json)(),
    rawBody: (0, import_fields34.text)({ ui: { displayMode: "textarea" } }),
    error: (0, import_fields34.text)({ ui: { displayMode: "textarea" } }),
    attempts: (0, import_fields34.integer)({ defaultValue: 0 }),
    receivedAt: (0, import_fields34.timestamp)({ defaultValue: { kind: "now" }, isIndexed: true }),
    processedAt: (0, import_fields34.timestamp)(),
    payment: (0, import_fields34.relationship)({ ref: "Payment" }),
    ...trackingFields
  }
});

// features/keystone/models/IdempotencyKey.ts
var import_core14 = require("@keystone-6/core");
var import_fields35 = require("@keystone-6/core/fields");
var IdempotencyKey = (0, import_core14.list)({
  access: {
    operation: {
      query: () => false,
      create: () => false,
      update: () => false,
      delete: () => false
    }
  },
  ui: { isHidden: true },
  fields: {
    idempotencyKey: (0, import_fields35.text)({
      isIndexed: "unique",
      validation: { isRequired: true }
    }),
    requestMethod: (0, import_fields35.text)({ validation: { isRequired: true } }),
    requestParams: (0, import_fields35.json)(),
    requestPath: (0, import_fields35.text)({ validation: { isRequired: true } }),
    responseCode: (0, import_fields35.integer)(),
    responseBody: (0, import_fields35.json)(),
    recoveryPoint: (0, import_fields35.text)({
      defaultValue: "started",
      validation: { isRequired: true }
    }),
    lockedAt: (0, import_fields35.timestamp)(),
    ...trackingFields
  }
});

// features/keystone/models/index.ts
var models = { User, Role, OAuthApp, OAuthToken, Agency, AgentCertification, Team, Athlete, RepresentationAgreement, Contact, Brand, Interaction, PlayingContract, ContractYear, Incentive, EndorsementDeal, Deliverable, ScheduledPayment, CommissionInvoice, CommissionInvoiceLine, CommissionLedgerEntry, AgentSplit, ClientTrustAccount, ClientTrustEntry, Document, Task, AuditEvent, PaymentProvider, PaymentCollection, PaymentSession, Payment, Refund, PaymentWebhookEvent, IdempotencyKey };

// features/keystone/index.ts
var import_session = require("@keystone-6/core/session");

// features/keystone/mutations/index.ts
var import_schema = require("@graphql-tools/schema");

// features/keystone/mutations/redirectToInit.ts
async function redirectToInit(root, args, context) {
  const userCount = await context.sudo().query.User.count({});
  if (userCount === 0) {
    return true;
  }
  return false;
}
var redirectToInit_default = redirectToInit;

// features/keystone/lib/agencyCommand.ts
var import_node_crypto3 = __toESM(require("node:crypto"));

// features/keystone/utils/idempotency.ts
var import_node_crypto2 = __toESM(require("node:crypto"));
function normalize(value) {
  if (value === null || value === void 0) return null;
  if (typeof value === "string" || typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("Idempotency request contains a non-finite number");
    return value;
  }
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== void 0).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, normalize(entry)])
    );
  }
  throw new Error(`Unsupported idempotency request value: ${typeof value}`);
}
function canonicalIdempotencyParams(params) {
  return normalize(params);
}
function idempotencyFingerprint(params) {
  return import_node_crypto2.default.createHash("sha256").update(JSON.stringify(canonicalIdempotencyParams(params))).digest("hex");
}
function storedFingerprint(requestParams) {
  const params = requestParams && typeof requestParams === "object" ? { ...requestParams } : {};
  const recorded = typeof params._fingerprint === "string" ? params._fingerprint : null;
  delete params._fingerprint;
  const calculated = idempotencyFingerprint(params);
  if (recorded && recorded !== calculated) {
    throw new Error("Stored idempotency request fingerprint is invalid");
  }
  return calculated;
}
function assertIdempotencyRequest(attempt, request) {
  const method = request.requestMethod || "POST";
  const expectedFingerprint = idempotencyFingerprint(request.requestParams);
  if (attempt.requestMethod !== method || attempt.requestPath !== request.requestPath || storedFingerprint(attempt.requestParams) !== expectedFingerprint) {
    throw new Error("Idempotency key was already used with a different request");
  }
}
async function findIdempotencyAttempt(prisma, request) {
  const key = request.key.trim();
  if (!key) throw new Error("Idempotency key is required");
  const existing = await prisma.idempotencyKey.findUnique({ where: { idempotencyKey: key } });
  if (existing) assertIdempotencyRequest(existing, { ...request, key });
  return existing;
}
async function getOrCreateIdempotencyAttempt(prisma, request) {
  const key = request.key.trim();
  if (!key) throw new Error("Idempotency key is required");
  const normalizedParams = canonicalIdempotencyParams(request.requestParams);
  const data = {
    idempotencyKey: key,
    requestMethod: request.requestMethod || "POST",
    requestPath: request.requestPath,
    requestParams: {
      ...normalizedParams,
      _fingerprint: idempotencyFingerprint(request.requestParams)
    },
    recoveryPoint: "started",
    lockedAt: /* @__PURE__ */ new Date()
  };
  const existing = await findIdempotencyAttempt(prisma, { ...request, key });
  if (existing) return { attempt: existing, replay: true };
  try {
    const attempt = await prisma.idempotencyKey.create({ data });
    return { attempt, replay: false };
  } catch (error) {
    if (error?.code !== "P2002") throw error;
    const raced = await prisma.idempotencyKey.findUnique({ where: { idempotencyKey: key } });
    if (!raced) throw error;
    assertIdempotencyRequest(raced, { ...request, key });
    return { attempt: raced, replay: true };
  }
}
async function updateIdempotencyAttempt(prisma, attemptId, recoveryPoint, responseBody, responseCode) {
  await prisma.idempotencyKey.update({
    where: { id: attemptId },
    data: {
      recoveryPoint,
      responseBody,
      responseCode,
      lockedAt: ["completed", "failed"].includes(recoveryPoint) ? null : /* @__PURE__ */ new Date()
    }
  });
}

// features/keystone/lib/agencyCommand.ts
async function lockTransactionKey(tx, key) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key}, 0))`;
}
function humanCode(prefix) {
  return prefix + "-" + import_node_crypto3.default.randomBytes(8).toString("hex").toUpperCase();
}
async function authorizeAthlete(tx, context, athleteId, permission) {
  if (!context.session?.itemId || !permissions[permission]({ session: context.session })) throw new Error("Not authorized");
  const athlete = await tx.athlete.findUnique({ where: { id: athleteId }, include: { supportStaff: { select: { id: true } } } });
  if (!athlete || !context.session.data.role.canViewAllClients && athlete.leadAgentId !== context.session.itemId && !athlete.supportStaff.some((s) => s.id === context.session.itemId)) throw new Error("Athlete not found");
  return athlete;
}
async function audit(tx, context, action, targetList, targetId, before, after, requestId) {
  return tx.auditEvent.create({ data: { actorId: context.session?.itemId, action, targetList, targetId, before: JSON.parse(JSON.stringify(before ?? null, (_, v) => typeof v === "bigint" ? v.toString() : v)), after: JSON.parse(JSON.stringify(after ?? null, (_, v) => typeof v === "bigint" ? v.toString() : v)), requestId } });
}
async function command(context, permission, athleteId, action, args, fn) {
  if (!args.idempotencyKey?.trim()) throw new Error("Idempotency key required");
  return context.prisma.$transaction(async (tx) => {
    await authorizeAthlete(tx, context, athleteId, permission);
    await lockTransactionKey(tx, "athlete:" + athleteId);
    const { attempt, replay } = await getOrCreateIdempotencyAttempt(tx, { key: args.idempotencyKey, requestPath: action, requestParams: { ...args, actorId: context.session.itemId, athleteId } });
    if (replay) {
      if (attempt.recoveryPoint === "completed") return attempt.responseBody;
      throw new Error("Command already processing");
    }
    const result = await fn(tx);
    const safe = JSON.parse(JSON.stringify(result, (_, v) => typeof v === "bigint" ? v.toString() : v));
    await updateIdempotencyAttempt(tx, attempt.id, "completed", safe, 200);
    return safe;
  }, { timeout: 6e4, maxWait: 15e3 });
}
async function transition(tx, context, model, id, from, to, requestId, extra = {}) {
  const before = await tx[model].findUnique({ where: { id } });
  if (!before || !from.includes(before.status)) throw new Error("Invalid state transition");
  const changed = await tx[model].updateMany({ where: { id, status: before.status }, data: { status: to, ...extra } });
  if (changed.count !== 1) throw new Error("Record changed concurrently");
  const after = await tx[model].findUnique({ where: { id } });
  await audit(tx, context, model + ":" + to, model, id, before, after, requestId);
  return after;
}

// features/keystone/lib/commission.ts
function commission(grossCents, bps18) {
  if (!Number.isSafeInteger(grossCents) || grossCents < 0 || !Number.isInteger(bps18) || bps18 < 0 || bps18 > 1e4) throw new Error("Invalid commission basis");
  const product = BigInt(grossCents) * BigInt(bps18);
  return { commissionCents: Number(product / BigInt(1e4)), remainder: Number(product % BigInt(1e4)) };
}
function allocateCommission(amountCents, splits) {
  if (!Number.isSafeInteger(amountCents) || amountCents < 0 || !splits.length || splits.some((s) => !s.userId || !Number.isInteger(s.shareBps) || s.shareBps < 0) || splits.reduce((n, s) => n + s.shareBps, 0) !== 1e4 || new Set(splits.map((s) => s.userId)).size !== splits.length) throw new Error("Agent splits must sum to 10000");
  const rows = splits.map((s) => ({ ...s, ...commission(amountCents, s.shareBps) }));
  let remaining = amountCents - rows.reduce((n, s) => n + s.commissionCents, 0);
  rows.sort((a, b) => b.remainder - a.remainder || a.userId.localeCompare(b.userId));
  for (const row of rows) if (remaining-- > 0) row.commissionCents++;
  return rows.map(({ userId, commissionCents }) => ({ userId, amountCents: commissionCents }));
}
function trustBalance(balance, amount) {
  const next = balance + amount;
  if (next < BigInt(0)) throw new Error("Insufficient client trust balance");
  return next;
}
function exactReversal(amount, isReversal, alreadyReversed) {
  if (isReversal || alreadyReversed) throw new Error("Entry cannot be reversed twice");
  return -amount;
}
function installmentAmounts(total, periods) {
  if (!Number.isSafeInteger(total) || total < 0 || !Number.isInteger(periods) || periods < 1 || periods > 366) throw new Error("Invalid payment schedule");
  return Array.from({ length: periods }, (_, i) => Math.floor(total / periods) + (i < total % periods ? 1 : 0));
}

// features/keystone/mutations/agency.ts
async function locate(context, model, id, include = {}) {
  if (!context.session) throw new Error("Not authorized");
  const row = await context.prisma[model].findUnique({ where: { id }, include });
  if (!row) throw new Error("Record not found");
  return row;
}
var agencyMutations = {
  async signRepresentationAgreement(_, a, c) {
    const row = await locate(c, "representationAgreement", a.agreementId);
    return command(c, "canManageContracts", row.athleteId, "signRepresentationAgreement", a, async (tx) => {
      const agreement = await tx.representationAgreement.findUnique({ where: { id: row.id } });
      if (agreement.playingCommissionBps > agreement.capBps) throw new Error("Playing commission exceeds union cap");
      const scopes = agreement.scope === "both" ? ["playing", "marketing", "both"] : [agreement.scope, "both"];
      if (await tx.representationAgreement.findFirst({ where: { athleteId: row.athleteId, id: { not: row.id }, scope: { in: scopes }, status: { in: ["signed", "filed_with_union", "active"] } } })) throw new Error("Active representation agreement already exists");
      return transition(tx, c, "representationAgreement", row.id, ["draft", "sent"], "signed", a.idempotencyKey);
    });
  },
  async recordContractSigned(_, a, c) {
    const row = await locate(c, "playingContract", a.contractId);
    return command(c, "canManageContracts", row.athleteId, "recordContractSigned", a, async (tx) => {
      const contract = await tx.playingContract.findUnique({ where: { id: row.id }, include: { representationAgreement: true } });
      const agreement = contract.representationAgreement;
      if (!agreement || agreement.athleteId !== row.athleteId || !["playing", "both"].includes(agreement.scope) || !["signed", "filed_with_union", "active"].includes(agreement.status) || agreement.expiresAt && agreement.expiresAt < /* @__PURE__ */ new Date() || agreement.effectiveAt && agreement.effectiveAt > /* @__PURE__ */ new Date()) throw new Error("Active playing representation required");
      if (agreement.playingCommissionBps > agreement.capBps) throw new Error("Union commission cap exceeded");
      return transition(tx, c, "playingContract", row.id, ["negotiating"], "signed", a.idempotencyKey, { signedAt: /* @__PURE__ */ new Date(), commissionBps: agreement.playingCommissionBps });
    });
  },
  async generatePaymentSchedule(_, a, c) {
    if (Boolean(a.contractId) === Boolean(a.dealId)) throw new Error("Choose contract or endorsement");
    const row = await locate(c, a.contractId ? "playingContract" : "endorsementDeal", a.contractId || a.dealId);
    return command(c, "canManageCommissions", row.athleteId, "generatePaymentSchedule", a, async (tx) => {
      const current = await tx[a.contractId ? "playingContract" : "endorsementDeal"].findUnique({ where: { id: row.id } });
      if (!["signed", "active"].includes(current.status)) throw new Error("Signed source required");
      const periods = a.contractId ? await tx.contractYear.findMany({ where: { contractId: row.id } }) : [{ id: row.id, baseSalaryCents: current.totalValueCents, payPeriods: 1, season: new Date(current.termStart || Date.now()).getUTCFullYear().toString() }];
      const rows = [];
      for (const year of periods) {
        const amounts = installmentAmounts(a.contractId ? year.baseSalaryCents + year.rosterBonusCents + year.workoutBonusCents : year.baseSalaryCents, year.payPeriods);
        for (let i = 0; i < amounts.length; i++) {
          const sourceKey = (a.contractId ? "contract:" : "deal:") + year.id + ":" + i;
          const dueAt = a.contractId ? new Date(Date.UTC(Number(year.season), 10, 1 + i * 7)) : current.termStart || /* @__PURE__ */ new Date();
          rows.push({ sourceKey, athleteId: row.athleteId, ...a.contractId ? { contractYearId: year.id } : { endorsementDealId: row.id }, dueAt, grossCents: amounts[i], commissionBps: current.commissionBps, currencyCode: current.currencyCode, status: "scheduled" });
        }
      }
      const created = await tx.scheduledPayment.createMany({ data: rows, skipDuplicates: true });
      const records = { length: created.count };
      await audit(tx, c, "schedule.generated", "Athlete", row.athleteId, null, { count: records.length }, a.idempotencyKey);
      return { count: rows.length, created: records.length };
    });
  },
  async markPaymentReceived(_, a, c) {
    const row = await locate(c, "scheduledPayment", a.scheduledPaymentId);
    return command(c, "canManageCommissions", row.athleteId, "markPaymentReceived", a, async (tx) => {
      const payment = await tx.scheduledPayment.findUnique({ where: { id: row.id } });
      const math = commission(payment.grossCents, payment.commissionBps);
      const updated = await transition(tx, c, "scheduledPayment", row.id, ["scheduled", "late"], "received", a.idempotencyKey, { receivedAt: /* @__PURE__ */ new Date(), ...math });
      await tx.commissionLedgerEntry.create({ data: { entryKey: "accrual:" + row.id, athleteId: row.athleteId, scheduledPaymentId: row.id, entryType: "accrual", amountCents: BigInt(math.commissionCents), reason: "Athlete payment received", preparedById: c.session.itemId, occurredAt: /* @__PURE__ */ new Date(), currencyCode: payment.currencyCode } });
      return updated;
    });
  },
  async draftCommissionInvoice(_, a, c) {
    return command(c, "canManageCommissions", a.athleteId, "draftCommissionInvoice", a, async (tx) => {
      if (!a.scheduledPaymentIds?.length || new Set(a.scheduledPaymentIds).size !== a.scheduledPaymentIds.length) throw new Error("Unique scheduled payments required");
      const rows = await tx.scheduledPayment.findMany({ where: { id: { in: a.scheduledPaymentIds }, athleteId: a.athleteId, status: "received", invoiceId: null } });
      if (rows.length !== a.scheduledPaymentIds.length || new Set(rows.map((r) => r.currencyCode)).size !== 1) throw new Error("Received uninvoiced payments in one currency required");
      const invoice = await tx.commissionInvoice.create({ data: { athleteId: a.athleteId, number: humanCode("INV"), totalCents: rows.reduce((n, r) => n + r.commissionCents, 0), currencyCode: rows[0].currencyCode, status: "draft", issuedAt: /* @__PURE__ */ new Date(), dueAt: new Date(Date.now() + 30 * 864e5) } });
      for (const row of rows) {
        await tx.commissionInvoiceLine.create({ data: { invoiceId: invoice.id, scheduledPaymentId: row.id, description: "Commission " + row.sourceKey, grossCents: row.grossCents, commissionBps: row.commissionBps, commissionCents: row.commissionCents, unitPriceCents: row.commissionCents, quantity: 1, currencyCode: row.currencyCode } });
        await tx.scheduledPayment.update({ where: { id: row.id }, data: { invoiceId: invoice.id } });
      }
      await audit(tx, c, "invoice.created", "CommissionInvoice", invoice.id, null, invoice, a.idempotencyKey);
      return invoice;
    });
  },
  async voidCommissionInvoice(_, a, c) {
    const row = await locate(c, "commissionInvoice", a.invoiceId);
    return command(c, "canManageCommissions", row.athleteId, "voidCommissionInvoice", a, async (tx) => {
      const inv = await tx.commissionInvoice.findUnique({ where: { id: row.id } });
      if (inv.paidCents > 0) throw new Error("Reverse payments before voiding a paid invoice");
      if (!a.reason?.trim()) throw new Error("Void reason required");
      const result = await transition(tx, c, "commissionInvoice", row.id, ["draft", "sent"], "void", a.idempotencyKey);
      await tx.scheduledPayment.updateMany({ where: { invoiceId: row.id }, data: { invoiceId: null } });
      return result;
    });
  },
  async sendCommissionInvoice(_, a, c) {
    const row = await locate(c, "commissionInvoice", a.invoiceId);
    return command(c, "canManageCommissions", row.athleteId, "sendCommissionInvoice", a, async (tx) => transition(tx, c, "commissionInvoice", row.id, ["draft"], "sent", a.idempotencyKey));
  },
  async recordInvoicePayment(_, a, c) {
    const row = await locate(c, "commissionInvoice", a.invoiceId);
    return command(c, "canManageCommissions", row.athleteId, "recordInvoicePayment", a, async (tx) => {
      const invoice = await tx.commissionInvoice.findUnique({ where: { id: row.id } });
      if (!Number.isSafeInteger(a.amountCents) || a.amountCents < 1 || a.amountCents > invoice.totalCents - invoice.paidCents || !a.reference?.trim()) throw new Error("Valid payment amount and reference required");
      const paid = invoice.paidCents + a.amountCents;
      await transition(tx, c, "commissionInvoice", row.id, ["sent", "partially_paid"], paid === invoice.totalCents ? "paid" : "partially_paid", a.idempotencyKey, { paidCents: paid });
      const entry = await tx.commissionLedgerEntry.create({ data: { entryKey: "receipt:" + a.idempotencyKey, athleteId: row.athleteId, invoiceId: row.id, entryType: "receipt", amountCents: -BigInt(a.amountCents), reason: a.reference, preparedById: c.session.itemId, occurredAt: /* @__PURE__ */ new Date(), currencyCode: invoice.currencyCode } });
      const splits = await tx.agentSplit.findMany({ where: { athleteId: row.athleteId } });
      if (splits.length) {
        for (const split of allocateCommission(a.amountCents, splits.map((s) => ({ userId: s.userId, shareBps: s.shareBps })))) await tx.commissionLedgerEntry.create({ data: { entryKey: "split:" + entry.id + ":" + split.userId, athleteId: row.athleteId, invoiceId: row.id, payeeUserId: split.userId, entryType: "split_to_agent", amountCents: BigInt(split.amountCents), reason: "Agent receipt allocation", preparedById: c.session.itemId, occurredAt: /* @__PURE__ */ new Date(), currencyCode: invoice.currencyCode } });
      }
      return { id: invoice.id, paidCents: paid, status: paid === invoice.totalCents ? "paid" : "partially_paid" };
    });
  },
  async reverseLedgerEntry(_, a, c) {
    const row = await locate(c, "commissionLedgerEntry", a.entryId);
    return command(c, "canManageCommissions", row.athleteId, "reverseLedgerEntry", a, async (tx) => {
      const original = await tx.commissionLedgerEntry.findUnique({ where: { id: row.id } });
      const reversed = await tx.commissionLedgerEntry.findUnique({ where: { reversalKey: row.id } });
      if (!a.reason?.trim()) throw new Error("Reversal reason required");
      const amount = exactReversal(original.amountCents, original.entryType === "reversal", Boolean(reversed));
      if (original.entryType === "accrual" && original.scheduledPaymentId && (await tx.scheduledPayment.findUnique({ where: { id: original.scheduledPaymentId } })).invoiceId) throw new Error("Void the invoice before reversing its accrual");
      const reverseOne = (e, amt) => tx.commissionLedgerEntry.create({ data: { entryKey: "reversal:" + e.id, reversalKey: e.id, reversesId: e.id, athleteId: e.athleteId, invoiceId: e.invoiceId, scheduledPaymentId: e.scheduledPaymentId, payeeUserId: e.payeeUserId, entryType: "reversal", amountCents: amt, reason: a.reason, preparedById: c.session.itemId, occurredAt: /* @__PURE__ */ new Date(), currencyCode: e.currencyCode } });
      const result = await reverseOne(original, amount);
      if (original.entryType === "receipt" && original.invoiceId) {
        const inv = await tx.commissionInvoice.findUnique({ where: { id: original.invoiceId } });
        const paid = Math.max(0, inv.paidCents + Number(original.amountCents));
        await tx.commissionInvoice.update({ where: { id: inv.id }, data: { paidCents: paid, status: paid === 0 ? "sent" : "partially_paid" } });
        for (const split of await tx.commissionLedgerEntry.findMany({ where: { entryType: "split_to_agent", entryKey: { startsWith: "split:" + original.id + ":" } } })) await reverseOne(split, exactReversal(split.amountCents, false, false));
      }
      await audit(tx, c, "ledger.reversed", "CommissionLedgerEntry", result.id, original, result, a.idempotencyKey);
      return result;
    });
  },
  async postTrustEntry(_, a, c) {
    const row = await locate(c, "clientTrustAccount", a.accountId);
    return command(c, "canManageTrust", row.athleteId, "postTrustEntry", a, async (tx) => {
      if (!Number.isSafeInteger(a.amountCents) || a.amountCents < 1 || !a.reference?.trim() || !["deposit", "commission_transfer", "disbursement_to_client", "reversal"].includes(a.entryType)) throw new Error("Invalid trust entry");
      let amount = BigInt(a.amountCents) * (a.entryType === "deposit" ? BigInt(1) : -BigInt(1));
      let reversalKey = null;
      if (a.entryType === "reversal") {
        const original = await tx.clientTrustEntry.findUnique({ where: { id: a.reversesId } });
        if (!original || original.accountId !== row.id) throw new Error("Trust entry not found");
        amount = exactReversal(original.amountCents, original.entryType === "reversal", Boolean(await tx.clientTrustEntry.findUnique({ where: { reversalKey: original.id } })));
        reversalKey = original.id;
      }
      if (a.entryType === "commission_transfer") {
        const invoice = await tx.commissionInvoice.findUnique({ where: { id: a.invoiceId } });
        if (!invoice || invoice.athleteId !== row.athleteId || invoice.currencyCode !== row.currencyCode || !["sent", "partially_paid"].includes(invoice.status)) throw new Error("Sent athlete invoice required");
        const transfers = await tx.clientTrustEntry.aggregate({ where: { invoiceId: invoice.id, entryType: "commission_transfer" }, _sum: { amountCents: true } });
        if (-BigInt(transfers._sum.amountCents || 0) + BigInt(a.amountCents) > BigInt(invoice.totalCents)) throw new Error("Transfer exceeds invoice");
      }
      const sum = await tx.clientTrustEntry.aggregate({ where: { accountId: row.id }, _sum: { amountCents: true } });
      trustBalance(BigInt(sum._sum.amountCents || 0), amount);
      const result = await tx.clientTrustEntry.create({ data: { accountId: row.id, athleteId: row.athleteId, invoiceId: a.invoiceId || null, entryType: a.entryType, amountCents: amount, reference: a.reference, occurredAt: /* @__PURE__ */ new Date(), currencyCode: row.currencyCode, reversalKey, reversesId: reversalKey } });
      await audit(tx, c, "trust.posted", "ClientTrustEntry", result.id, null, result, a.idempotencyKey);
      return result;
    });
  },
  async moveRecruitingStage(_, a, c) {
    return command(c, "canManageAthletes", a.athleteId, "moveRecruitingStage", a, async (tx) => {
      const row = await tx.athlete.findUnique({ where: { id: a.athleteId } });
      const stages = ["identified", "contacted", "meeting", "pitched", "verbal", "signed", "lost"];
      if (!stages.includes(a.stage) || a.stage === row.recruitingStage) throw new Error("Invalid recruiting stage");
      if (row.contactAllowedFrom && row.contactAllowedFrom > /* @__PURE__ */ new Date() && a.stage !== "lost") throw new Error("Contact window has not opened");
      const result = await tx.athlete.update({ where: { id: row.id }, data: { recruitingStage: a.stage } });
      await audit(tx, c, "recruiting.moved", "Athlete", row.id, row, result, a.idempotencyKey);
      return result;
    });
  },
  async activateEndorsementDeal(_, a, c) {
    const row = await locate(c, "endorsementDeal", a.dealId);
    const clash = async (db) => row.termStart && row.termEnd && row.exclusivityCategory ? db.endorsementDeal.findFirst({ where: { athleteId: row.athleteId, id: { not: row.id }, exclusivityCategory: row.exclusivityCategory, status: { in: ["signed", "active"] }, termStart: { lte: row.termEnd }, termEnd: { gte: row.termStart } }, select: { id: true } }) : null;
    if (await clash(c.prisma)) {
      await c.prisma.auditEvent.create({ data: { actorId: c.session?.itemId, action: "deal.conflict_blocked", targetList: "EndorsementDeal", targetId: row.id, after: { category: row.exclusivityCategory }, reason: "Exclusivity conflict with an active deal", requestId: a.idempotencyKey } }).catch(() => null);
      throw new Error("Exclusivity conflict with an active deal");
    }
    return command(c, "canManageEndorsements", row.athleteId, "activateEndorsementDeal", a, async (tx) => {
      if (await clash(tx)) throw new Error("Exclusivity conflict with an active deal");
      return transition(tx, c, "endorsementDeal", row.id, ["prospect", "negotiating", "signed"], "active", a.idempotencyKey);
    });
  },
  async generateAutoTasks(_, a, c) {
    if (!c.session?.itemId || !permissions.canManageAthletes({ session: c.session })) throw new Error("Not authorized");
    const db = c.prisma, now = Date.now(), day = 864e5, out = [];
    const make = async (autoKey, title, dueAt, extra, assigneeId) => {
      if (await db.task.findUnique({ where: { autoKey } })) return;
      out.push(await db.task.create({ data: { autoKey, title, dueAt, priority: "high", status: "open", ...assigneeId ? { assigneeId } : {}, ...extra } }));
    };
    for (const x of await db.agentCertification.findMany({ where: { status: "active", expiresAt: { lte: new Date(now + 60 * day) } }, take: 200 })) await make("cert:" + x.id, "Renew agent certification", x.expiresAt, {}, x.userId);
    for (const x of await db.representationAgreement.findMany({ where: { status: { in: ["signed", "filed_with_union", "active"] }, expiresAt: { lte: new Date(now + 90 * day) } }, include: { athlete: true }, take: 200 })) await make("agreement:" + x.id, "Agreement expiring", x.expiresAt, { athleteId: x.athleteId }, x.athlete?.leadAgentId);
    for (const x of await db.deliverable.findMany({ where: { status: "scheduled", dueAt: { lte: new Date(now + 7 * day) } }, include: { deal: true }, take: 200 })) await make("deliverable:" + x.id, "Deliverable due", x.dueAt, { athleteId: x.deal?.athleteId, dealId: x.dealId }, x.deal?.ownerId);
    for (const x of await db.scheduledPayment.findMany({ where: { status: { in: ["scheduled", "late"] }, dueAt: { lt: new Date(now) } }, include: { athlete: true }, take: 200 })) await make("payment:" + x.id, "Overdue payment follow-up", x.dueAt, { athleteId: x.athleteId }, x.athlete?.leadAgentId);
    return { created: out.length };
  },
  async completeDeliverable(_, a, c) {
    const row = await locate(c, "deliverable", a.deliverableId, { deal: true });
    return command(c, "canManageEndorsements", row.deal.athleteId, "completeDeliverable", a, async (tx) => {
      if (!a.proofLink?.startsWith("https://")) throw new Error("HTTPS proof required");
      return transition(tx, c, "deliverable", row.id, ["scheduled", "missed"], "completed", a.idempotencyKey, { completedAt: /* @__PURE__ */ new Date(), proofLink: a.proofLink });
    });
  }
};
var agencyQueries = {
  async checkEndorsementConflicts(_, a, c) {
    return c.prisma.$transaction(async (tx) => {
      await authorizeAthlete(tx, c, a.athleteId, "canManageEndorsements");
      const start = new Date(a.start), end = new Date(a.end);
      if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) throw new Error("Invalid term");
      return tx.endorsementDeal.findMany({ where: { athleteId: a.athleteId, exclusivityCategory: a.category, status: { in: ["signed", "active"] }, termStart: { lte: end }, termEnd: { gte: start } }, select: { id: true, status: true, termStart: true, termEnd: true }, take: 100 });
    });
  }
};
var agencyTypeDefs = `
 scalar AgencyJSON
 extend type Query { checkEndorsementConflicts(athleteId:ID!,category:String!,start:String!,end:String!):AgencyJSON! }
 extend type Mutation {
 signRepresentationAgreement(agreementId:ID!,idempotencyKey:String!):AgencyJSON!
 recordContractSigned(contractId:ID!,idempotencyKey:String!):AgencyJSON!
 generatePaymentSchedule(contractId:ID,dealId:ID,idempotencyKey:String!):AgencyJSON!
 markPaymentReceived(scheduledPaymentId:ID!,idempotencyKey:String!):AgencyJSON!
 draftCommissionInvoice(athleteId:ID!,scheduledPaymentIds:[ID!]!,idempotencyKey:String!):AgencyJSON!
 sendCommissionInvoice(invoiceId:ID!,idempotencyKey:String!):AgencyJSON!
 voidCommissionInvoice(invoiceId:ID!,reason:String!,idempotencyKey:String!):AgencyJSON!
 recordInvoicePayment(invoiceId:ID!,amountCents:Int!,reference:String!,idempotencyKey:String!):AgencyJSON!
 reverseLedgerEntry(entryId:ID!,reason:String!,idempotencyKey:String!):AgencyJSON!
 postTrustEntry(accountId:ID!,entryType:String!,amountCents:Int!,reference:String!,invoiceId:ID,reversesId:ID,idempotencyKey:String!):AgencyJSON!
 moveRecruitingStage(athleteId:ID!,stage:String!,idempotencyKey:String!):AgencyJSON!
 completeDeliverable(deliverableId:ID!,proofLink:String!,idempotencyKey:String!):AgencyJSON!
 activateEndorsementDeal(dealId:ID!,idempotencyKey:String!):AgencyJSON!
 generateAutoTasks:AgencyJSON!
 }
`;

// features/keystone/mutations/ensureOnboardingRecord.ts
var import_node_crypto4 = __toESM(require("node:crypto"));
var dt = (v) => v ? new Date(v) : void 0;
var days = (n) => new Date(Date.now() + n * 864e5);
var clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== void 0));
async function must(db, model, where, label) {
  const row = await db[model].findFirst({ where });
  if (!row) throw new Error(`${label} not found`);
  return row;
}
async function findOrCreate(db, model, where, data) {
  return await db[model].findFirst({ where }) || db[model].create({ data });
}
var handlers = {
  async Agency(c, d) {
    const db = c.prisma;
    return await db.agency.findFirst() || db.agency.create({ data: d });
  },
  async Role(c, d) {
    const db = c.prisma;
    const flags = Object.fromEntries(permissionNames.map((n) => [n, (d.permissions || []).includes(n) || d.permissions?.includes("*")]));
    return await db.role.findFirst({ where: { name: d.name } }) || db.role.create({ data: { name: d.name, ...flags } });
  },
  async Staff(c, d) {
    const db = c.prisma;
    const existing = await db.user.findFirst({ where: { email: d.email } });
    if (existing) return existing;
    const role = await must(db, "role", { name: d.role }, "Role");
    return c.sudo().query.User.createOne({ data: { name: d.name, email: d.email, password: import_node_crypto4.default.randomBytes(18).toString("base64url"), role: { connect: { id: role.id } } }, query: "id" });
  },
  async AgentCertification(c, d) {
    const db = c.prisma;
    const user = await must(db, "user", { email: d.userEmail }, "Agent");
    return findOrCreate(db, "agentCertification", { number: d.number }, { userId: user.id, body: d.body, number: d.number, issuedAt: dt(d.issuedAt), expiresAt: d.expiresInDays != null ? days(d.expiresInDays) : dt(d.expiresAt), status: d.status || "active" });
  },
  async Team(c, d) {
    return findOrCreate(c.prisma, "team", { name: d.name, league: d.league }, d);
  },
  async Athlete(c, d) {
    const db = c.prisma;
    const lead = d.leadAgentEmail ? await must(db, "user", { email: d.leadAgentEmail }, "Lead agent") : null;
    const team = d.team ? await must(db, "team", { name: d.team }, "Team") : null;
    const support = d.supportEmails?.length ? await db.user.findMany({ where: { email: { in: d.supportEmails } }, select: { id: true } }) : [];
    const { leadAgentEmail, team: _t, supportEmails, dateOfBirth, representationStartedAt, contactAllowedInDays, ...rest } = d;
    const existing = await db.athlete.findFirst({ where: { fullName: d.fullName } });
    if (existing) return existing;
    return db.athlete.create({ data: clean({ ...rest, dateOfBirth: dt(dateOfBirth), representationStartedAt: dt(representationStartedAt), contactAllowedFrom: contactAllowedInDays != null ? days(contactAllowedInDays) : void 0, leadAgentId: lead?.id, teamId: team?.id, supportStaff: support.length ? { connect: support } : void 0 }) });
  },
  async RepresentationAgreement(c, d) {
    const db = c.prisma;
    const athlete = await must(db, "athlete", { fullName: d.athlete }, "Athlete");
    const agent = await must(db, "user", { email: d.agentEmail }, "Agent");
    const { athlete: _a, agentEmail, effectiveAt, expiresAt, expiresInDays, ...rest } = d;
    return findOrCreate(db, "representationAgreement", { athleteId: athlete.id, scope: d.scope }, clean({ ...rest, athleteId: athlete.id, agentId: agent.id, effectiveAt: dt(effectiveAt), expiresAt: expiresInDays != null ? days(expiresInDays) : dt(expiresAt), filedAt: d.status === "filed_with_union" || d.status === "active" ? dt(effectiveAt) : void 0 }));
  },
  async Contact(c, d) {
    const db = c.prisma;
    const athletes = d.athletes?.length ? await db.athlete.findMany({ where: { fullName: { in: d.athletes } }, select: { id: true } }) : [];
    const { athletes: _a, ...rest } = d;
    return findOrCreate(db, "contact", { name: d.name, org: d.org }, { ...rest, athletes: athletes.length ? { connect: athletes } : void 0 });
  },
  async Brand(c, d) {
    const db = c.prisma;
    const contacts = d.contacts?.length ? await db.contact.findMany({ where: { name: { in: d.contacts } }, select: { id: true } }) : [];
    const { contacts: _c, ...rest } = d;
    return findOrCreate(db, "brand", { name: d.name }, { ...rest, contacts: contacts.length ? { connect: contacts } : void 0 });
  },
  async PlayingContract(c, d) {
    const db = c.prisma;
    const athlete = await must(db, "athlete", { fullName: d.athlete }, "Athlete");
    const team = d.team ? await must(db, "team", { name: d.team }, "Team") : null;
    const agreement = await must(db, "representationAgreement", { athleteId: athlete.id, scope: { in: ["playing", "both"] } }, "Playing agreement");
    const existing = await db.playingContract.findFirst({ where: { athleteId: athlete.id, startSeason: d.startSeason } });
    if (existing) return existing;
    const { athlete: _a, team: _t, years = [], incentives = [], signedAt, ...rest } = d;
    const contract = await db.playingContract.create({ data: clean({ ...rest, athleteId: athlete.id, teamId: team?.id, representationAgreementId: agreement.id, commissionBps: agreement.playingCommissionBps, signedAt: dt(signedAt) }) });
    for (const y of years) await db.contractYear.create({ data: { ...y, contractId: contract.id } });
    for (const i of incentives) await db.incentive.create({ data: { ...i, contractId: contract.id } });
    return contract;
  },
  async EndorsementDeal(c, d) {
    const db = c.prisma;
    const athlete = await must(db, "athlete", { fullName: d.athlete }, "Athlete");
    const brand = await must(db, "brand", { name: d.brand }, "Brand");
    const owner = await must(db, "user", { email: d.ownerEmail }, "Owner");
    const termStart = d.termStartInDays != null ? days(d.termStartInDays) : dt(d.termStart);
    const termEnd = d.termEndInDays != null ? days(d.termEndInDays) : dt(d.termEnd);
    const existing = await db.endorsementDeal.findFirst({ where: { athleteId: athlete.id, brandId: brand.id, exclusivityCategory: d.exclusivityCategory } });
    if (existing) return existing;
    const { athlete: _a, brand: _b, ownerEmail, deliverables = [], termStartInDays, termEndInDays, activate, status, ...rest } = d;
    const deal = await db.endorsementDeal.create({ data: clean({ ...rest, athleteId: athlete.id, brandId: brand.id, ownerId: owner.id, termStart, termEnd, status: activate ? "negotiating" : status, commissionBps: rest.commissionBps ?? 1500 }) });
    for (const x of deliverables) await db.deliverable.create({ data: clean({ dealId: deal.id, kind: x.kind, notes: x.notes, status: x.status || "scheduled", dueAt: days(x.dueInDays), completedAt: x.status === "completed" ? days(x.dueInDays) : void 0, proofLink: x.status === "completed" ? "https://proof.meridiansports.example/" + import_node_crypto4.default.randomBytes(4).toString("hex") : void 0 }) });
    if (activate) {
      try {
        await agencyMutations.activateEndorsementDeal(null, { dealId: deal.id, idempotencyKey: "seed:activate:" + deal.id }, c);
      } catch (e) {
        if (!/Exclusivity/.test(e.message)) throw e;
      }
    }
    return deal;
  },
  async AgentSplit(c, d) {
    const db = c.prisma;
    const athlete = await must(db, "athlete", { fullName: d.athlete }, "Athlete");
    const user = await must(db, "user", { email: d.userEmail }, "Agent");
    return findOrCreate(db, "agentSplit", { athleteId: athlete.id, userId: user.id }, { athleteId: athlete.id, userId: user.id, shareBps: d.shareBps });
  },
  async PaymentProvider(c, d) {
    return findOrCreate(c.prisma, "paymentProvider", { code: d.code }, d);
  },
  // Money: runs the same domain commands as operators (schedule, receipt/accrual, invoice, payment, reversal, trust).
  async Money(c, d) {
    const db = c.prisma;
    const run = (name, args) => agencyMutations[name](null, args, c);
    for (const contract of await db.playingContract.findMany({ where: { status: "signed" } })) await run("generatePaymentSchedule", { contractId: contract.id, idempotencyKey: "seed:sched:" + contract.id });
    for (const deal of await db.endorsementDeal.findMany({ where: { status: "active" } })) await run("generatePaymentSchedule", { dealId: deal.id, idempotencyKey: "seed:sched:" + deal.id });
    const dueAll = await db.scheduledPayment.findMany({ where: { status: "scheduled", dueAt: { lt: /* @__PURE__ */ new Date() } }, orderBy: [{ dueAt: "asc" }, { id: "asc" }], take: 500 });
    const taken = /* @__PURE__ */ new Map();
    const due = dueAll.filter((p) => {
      const n = taken.get(p.athleteId) || 0;
      if (n >= 3 || [...taken.values()].reduce((a, b) => a + b, 0) >= (d.receive ?? 14)) return false;
      taken.set(p.athleteId, n + 1);
      return true;
    });
    for (const p of due) await run("markPaymentReceived", { scheduledPaymentId: p.id, idempotencyKey: "seed:recv:" + p.id });
    await db.scheduledPayment.updateMany({ where: { status: "scheduled", dueAt: { lt: days(-30) } }, data: { status: "late" } });
    const received = await db.scheduledPayment.findMany({ where: { status: "received", invoiceId: null, commissionCents: { gt: 0 } }, orderBy: { id: "asc" } });
    const byAthlete = /* @__PURE__ */ new Map();
    for (const p of received) byAthlete.set(p.athleteId, [...byAthlete.get(p.athleteId) || [], p]);
    const plan = ["draft", "sent", "partially_paid", "paid", "void"];
    let i = 0;
    let firstReceipt = null;
    for (const [athleteId, list13] of byAthlete) {
      if (i >= plan.length) break;
      const status = plan[i++];
      const invoice = await run("draftCommissionInvoice", { athleteId, scheduledPaymentIds: list13.slice(0, 3).map((p) => p.id), idempotencyKey: "seed:inv:" + athleteId });
      if (status === "void") {
        await run("voidCommissionInvoice", { invoiceId: invoice.id, reason: "Issued in error", idempotencyKey: "seed:void:" + invoice.id });
        continue;
      }
      if (status === "draft") continue;
      await run("sendCommissionInvoice", { invoiceId: invoice.id, idempotencyKey: "seed:send:" + invoice.id });
      if (status === "partially_paid") await run("recordInvoicePayment", { invoiceId: invoice.id, amountCents: Math.max(1, Math.floor(invoice.totalCents / 2)), reference: "Wire received", idempotencyKey: "seed:pay:" + invoice.id });
      if (status === "paid") await run("recordInvoicePayment", { invoiceId: invoice.id, amountCents: invoice.totalCents, reference: "Wire received", idempotencyKey: "seed:pay:" + invoice.id });
    }
    const open = await db.commissionInvoice.findFirst({ where: { status: "sent" }, orderBy: { number: "asc" } });
    if (open) {
      await run("recordInvoicePayment", { invoiceId: open.id, amountCents: 1e5, reference: "Wire posted to wrong client", idempotencyKey: "seed:misposted:" + open.id });
      const bad = await db.commissionLedgerEntry.findFirst({ where: { invoiceId: open.id, entryType: "receipt" } });
      if (bad) await run("reverseLedgerEntry", { entryId: bad.id, reason: "Misposted wire corrected by accounting", idempotencyKey: "seed:rev:" + bad.id });
    }
    const trustAthlete = d.trustAthlete ? await db.athlete.findFirst({ where: { fullName: d.trustAthlete } }) : null;
    if (trustAthlete) {
      const account = await findOrCreate(db, "clientTrustAccount", { athleteId: trustAthlete.id }, { athleteId: trustAthlete.id, name: trustAthlete.fullName + " client funds", currencyCode: "USD" });
      await run("postTrustEntry", { accountId: account.id, entryType: "deposit", amountCents: d.trustDepositCents || 5e6, reference: "Endorsement payment held for client", idempotencyKey: "seed:trust:dep:" + account.id });
    }
    await run("generateAutoTasks", {});
    return { id: "money" };
  }
};
async function ensureOnboardingRecord(_root, { entity, data }, context) {
  if (!context.session?.itemId || !permissions.canManageOnboarding({ session: context.session })) throw new Error("Not authorized");
  const handler = handlers[entity];
  if (!handler) throw new Error("Unsupported setup record");
  const record = await handler(context, data);
  if (!record?.id) throw new Error(`${entity} setup did not return a persisted record`);
  return { id: record.id };
}

// features/keystone/mutations/updateActiveUser.ts
async function updateActiveUser(_root, { data }, context) {
  if (!isSignedIn({ session: context.session })) throw new Error("Not authenticated");
  const allowed = /* @__PURE__ */ new Set(["email", "name", "phone", "password", "onboardingStatus"]);
  if (Object.keys(data || {}).some((key) => !allowed.has(key))) throw new Error("Unsupported profile field");
  if (data.onboardingStatus && !["not_started", "in_progress", "completed", "dismissed"].includes(data.onboardingStatus)) throw new Error("Invalid onboarding status");
  const user = await context.sudo().db.User.updateOne({ where: { id: context.session.itemId }, data });
  return { id: user.id, onboardingStatus: user.onboardingStatus };
}

// features/keystone/mutations/portal.ts
async function portalAthlete(c) {
  if (!c.session?.itemId) throw new Error("Sign in required");
  const athlete = await c.prisma.athlete.findFirst({ where: { portalUserId: c.session.itemId }, select: { id: true, fullName: true, sport: true, league: true } });
  if (!athlete) throw new Error("Client profile not found");
  return athlete;
}
var portalQueries = {
  async myAthleteSummary(_, a, c) {
    const athlete = await portalAthlete(c);
    const [contracts, deals] = await Promise.all([c.prisma.playingContract.findMany({ where: { athleteId: athlete.id }, select: { id: true, status: true, startSeason: true, endSeason: true }, take: 100 }), c.prisma.endorsementDeal.findMany({ where: { athleteId: athlete.id }, select: { id: true, status: true, termStart: true, termEnd: true }, take: 100 })]);
    return { ...athlete, contracts, deals };
  },
  async myDeliverables(_, a, c) {
    const athlete = await portalAthlete(c);
    return c.prisma.deliverable.findMany({ where: { deal: { athleteId: athlete.id } }, select: { id: true, kind: true, status: true, dueAt: true, proofLink: true }, take: 100, orderBy: { dueAt: "asc" } });
  },
  async myInvoices(_, a, c) {
    const athlete = await portalAthlete(c);
    return c.prisma.commissionInvoice.findMany({ where: { athleteId: athlete.id }, select: { id: true, number: true, status: true, totalCents: true, paidCents: true, currencyCode: true, dueAt: true }, take: 100, orderBy: { createdAt: "desc" } });
  }
};
var portalMutations = { async payCommissionInvoice(_, a, c) {
  const athlete = await portalAthlete(c);
  const invoice = await c.prisma.commissionInvoice.findFirst({ where: { id: a.invoiceId, athleteId: athlete.id }, select: { id: true, status: true } });
  if (!invoice) throw new Error("Invoice not found");
  if (!["sent", "partially_paid"].includes(invoice.status)) throw new Error("Invoice not payable");
  throw new Error("Payment provider is not configured");
} };
var portalTypeDefs = `extend type Query { myAthleteSummary:AgencyJSON! myDeliverables:AgencyJSON! myInvoices:AgencyJSON! } extend type Mutation { payCommissionInvoice(invoiceId:ID!,idempotencyKey:String!):AgencyJSON! }`;

// features/keystone/mutations/index.ts
var graphql = String.raw;
function extendGraphqlSchema(baseSchema) {
  return (0, import_schema.mergeSchemas)({
    schemas: [baseSchema],
    typeDefs: graphql`
      type Query {
        redirectToInit: Boolean
      }
    ` + agencyTypeDefs + portalTypeDefs + `
      extend type Mutation { ensureOnboardingRecord(entity:String!,data:AgencyJSON!):AgencyJSON! updateActiveUser(data:AgencyJSON!):AgencyJSON! }
    `,
    resolvers: {
      Query: {
        redirectToInit: redirectToInit_default,
        ...agencyQueries,
        ...portalQueries
      },
      Mutation: { ...agencyMutations, ...portalMutations, ensureOnboardingRecord, updateActiveUser }
    }
  });
}

// features/keystone/lib/mail.ts
var import_nodemailer = require("nodemailer");
function getBaseUrlForEmails() {
  if (process.env.SMTP_STORE_LINK) {
    return process.env.SMTP_STORE_LINK;
  }
  console.warn("SMTP_STORE_LINK not set. Please add SMTP_STORE_LINK to your environment variables for email links to work properly.");
  return "";
}
var transport = (0, import_nodemailer.createTransport)({
  // @ts-ignore
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});
function passwordResetEmail({ url }) {
  const backgroundColor = "#f9f9f9";
  const textColor = "#444444";
  const mainBackgroundColor = "#ffffff";
  const buttonBackgroundColor = "#346df1";
  const buttonBorderColor = "#346df1";
  const buttonTextColor = "#ffffff";
  return `
    <body style="background: ${backgroundColor};">
      <table width="100%" border="0" cellspacing="20" cellpadding="0" style="background: ${mainBackgroundColor}; max-width: 600px; margin: auto; border-radius: 10px;">
        <tr>
          <td align="center" style="padding: 10px 0px 0px 0px; font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            Please click below to reset your password
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 20px 0;">
            <table border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center" style="border-radius: 5px;" bgcolor="${buttonBackgroundColor}"><a href="${url}" target="_blank" style="font-size: 18px; font-family: Helvetica, Arial, sans-serif; color: ${buttonTextColor}; text-decoration: none; border-radius: 5px; padding: 10px 20px; border: 1px solid ${buttonBorderColor}; display: inline-block; font-weight: bold;">Reset Password</a></td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td align="center" style="padding: 0px 0px 10px 0px; font-size: 16px; line-height: 22px; font-family: Helvetica, Arial, sans-serif; color: ${textColor};">
            If you did not request this email you can safely ignore it.
          </td>
        </tr>
      </table>
    </body>
  `;
}
async function sendPasswordResetEmail(resetToken, to, baseUrl) {
  const frontendUrl = baseUrl || getBaseUrlForEmails();
  const info = await transport.sendMail({
    to,
    from: process.env.SMTP_FROM,
    subject: "Your password reset token!",
    html: passwordResetEmail({
      url: `${frontendUrl}/dashboard/reset?token=${resetToken}`
    })
  });
  if (process.env.MAIL_USER?.includes("ethereal.email")) {
    console.log(`\u{1F4E7} Message Sent!  Preview it at ${(0, import_nodemailer.getTestMessageUrl)(info)}`);
  }
}

// features/keystone/mcp-oauth/session.ts
async function resolveMcpAccessToken(context, token, listKey = "User") {
  try {
    const sudo = context.sudo();
    const record = await sudo.db.OAuthToken.findOne({ where: { token: digestToken(token) } });
    if (!record || record.tokenType !== "access_token" || record.isRevoked !== "false" || !record.userId || !record.expiresAt || new Date(record.expiresAt).getTime() <= Date.now()) {
      return void 0;
    }
    const app = await sudo.db.OAuthApp.findOne({ where: { clientId: record.clientId } });
    if (!app || app.status !== "active") return void 0;
    const mcp = {
      clientId: record.clientId,
      scopes: storedScopes(record.scopes),
      tokenId: String(record.id)
    };
    return { itemId: String(record.userId), listKey, mcp };
  } catch {
    return void 0;
  }
}
function withMcpBearerSessions(strategy, listKey = "User") {
  return {
    ...strategy,
    async get({ context }) {
      const token = bearerToken(context?.req?.headers?.authorization);
      if (isMcpAccessToken(token)) return resolveMcpAccessToken(context, token, listKey);
      return strategy.get({ context });
    }
  };
}

// features/keystone/index.ts
var databaseURL = process.env.DATABASE_URL || "file:./keystone.db";
var sessionConfig = {
  maxAge: 60 * 60 * 24 * 360,
  // How long they stay signed in?
  secret: process.env.SESSION_SECRET || "this secret should only be used in testing"
};
var {
  S3_BUCKET_NAME: bucketName = "keystone-test",
  S3_REGION: region = "ap-southeast-2",
  S3_ACCESS_KEY_ID: accessKeyId = "keystone",
  S3_SECRET_ACCESS_KEY: secretAccessKey = "keystone",
  S3_ENDPOINT: endpoint = "https://sfo3.digitaloceanspaces.com"
} = process.env;
var { withAuth } = (0, import_auth.createAuth)({
  listKey: "User",
  identityField: "email",
  secretField: "password",
  initFirstItem: {
    fields: ["name", "email", "password"],
    itemData: {
      role: {
        create: {
          name: "Admin",
          ...Object.fromEntries(permissionNames.map((name) => [name, true]))
        }
      }
    }
  },
  passwordResetLink: {
    async sendToken(args) {
      await sendPasswordResetEmail(args.token, args.identity);
    }
  },
  sessionData: `
    name
    email
    role {
      id
      name
      ${permissionNames.join("\n")}
    }
  `
});
var keystone_default = withAuth(
  (0, import_core16.config)({
    db: {
      provider: "postgresql",
      url: databaseURL
    },
    lists: models,
    storage: {
      my_images: {
        kind: "s3",
        type: "image",
        bucketName,
        region,
        accessKeyId,
        secretAccessKey,
        endpoint,
        signed: { expiry: 5e3 },
        forcePathStyle: true
      }
    },
    ui: {
      isAccessAllowed: ({ session }) => session?.data.role?.canAccessDashboard ?? false
    },
    // MCP OAuth bearer tokens resolve to the approving user; everything else is unchanged.
    session: withMcpBearerSessions((0, import_session.statelessSessions)(sessionConfig)),
    graphql: {
      extendGraphqlSchema
    }
  })
);

// keystone.ts
var keystone_default2 = keystone_default;
//# sourceMappingURL=config.js.map
