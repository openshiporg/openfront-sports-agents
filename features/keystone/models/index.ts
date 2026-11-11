import { User } from "./User";
import { Role } from "./Role";
import { OAuthApp } from "./OAuthApp";
import { OAuthToken } from "./OAuthToken";
import { Agency } from "./Agency";
import { AgentCertification } from "./AgentCertification";
import { Team } from "./Team";
import { Athlete } from "./Athlete";
import { RepresentationAgreement } from "./RepresentationAgreement";
import { Contact } from "./Contact";
import { Brand } from "./Brand";
import { Interaction } from "./Interaction";
import { PlayingContract } from "./PlayingContract";
import { ContractYear } from "./ContractYear";
import { Incentive } from "./Incentive";
import { EndorsementDeal } from "./EndorsementDeal";
import { Deliverable } from "./Deliverable";
import { ScheduledPayment } from "./ScheduledPayment";
import { CommissionInvoice } from "./CommissionInvoice";
import { CommissionInvoiceLine } from "./CommissionInvoiceLine";
import { CommissionLedgerEntry } from "./CommissionLedgerEntry";
import { AgentSplit } from "./AgentSplit";
import { ClientTrustAccount } from "./ClientTrustAccount";
import { ClientTrustEntry } from "./ClientTrustEntry";
import { TrustReconciliation } from "./TrustReconciliation";
import { Document } from "./Document";
import { Task } from "./Task";
import { AuditEvent } from "./AuditEvent";
import { Amendment } from "./Amendment";
import { ForecastSnapshot } from "./ForecastSnapshot";
import { AgentPayout } from "./AgentPayout";
import { AgentPayoutEntry } from "./AgentPayoutEntry";
import { PaymentProvider } from "./PaymentProvider";
import { PaymentCollection } from "./PaymentCollection";
import { PaymentSession } from "./PaymentSession";
import { Payment } from "./Payment";
import { Refund } from "./Refund";
import { PaymentWebhookEvent } from "./PaymentWebhookEvent";
import { ManagerApproval } from "./ManagerApproval";
import { IdempotencyKey } from "./IdempotencyKey";
const rawModels = { User, Role, OAuthApp, OAuthToken, Agency, AgentCertification, Team, Athlete, RepresentationAgreement, Contact, Brand, Interaction, PlayingContract, ContractYear, Incentive, EndorsementDeal, Deliverable, ScheduledPayment, CommissionInvoice, CommissionInvoiceLine, CommissionLedgerEntry, AgentSplit, ClientTrustAccount, ClientTrustEntry, TrustReconciliation, Document, Task, AuditEvent, Amendment, ForecastSnapshot, AgentPayout, AgentPayoutEntry, PaymentProvider, PaymentCollection, PaymentSession, Payment, Refund, PaymentWebhookEvent, IdempotencyKey, ManagerApproval };
// Sidebar visibility follows the role: a list whose query access denies the session is hidden from navigation
// (Keystone evaluates ui.isHidden per session in admin meta). Explicit isHidden settings are kept.
export const models = Object.fromEntries(Object.entries(rawModels).map(([key, config]: [string, any]) => {
  const operationQuery = config?.access?.operation?.query;
  const filterQuery = config?.access?.filter?.query;
  if (typeof operationQuery !== 'function' && typeof filterQuery !== 'function') return [key, config];
  const existing = config?.ui?.isHidden;
  const isHidden = (args: any) => {
    if (existing === true || (typeof existing === 'function' && existing(args))) return true;
    if (typeof operationQuery === 'function' && !operationQuery(args)) return true;
    return typeof filterQuery === 'function' && filterQuery(args) === false;
  };
  return [key, { ...config, ui: { ...(config.ui ?? {}), isHidden } }];
})) as typeof rawModels;

export default models;
