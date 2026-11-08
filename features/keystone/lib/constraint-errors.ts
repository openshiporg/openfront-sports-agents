import { GraphQLError } from 'graphql'

type Rule = { code: string; message: string; fields?: string[] }
const AMOUNT = 'SPORTS_INVALID_AMOUNT'
const CURRENCY = { code: 'SPORTS_INVALID_CURRENCY', message: 'Currency must be a three-letter code, such as USD.' }
const TIME = 'SPORTS_INVALID_TIME_RANGE'

/** Database rules (migrations/20261108130000_concerts_invariants) and what a person should read when one refuses a write. */
export const CONSTRAINT_MESSAGES: Record<string, Rule> = {
  Agency_rates_valid: { code: 'SPORTS_INVALID_RATE', message: 'Default commissions must be between 0% and 100%, the refund threshold can’t be negative, and the fiscal year must start in month 1 to 12.' },
  RepresentationAgreement_rates_valid: { code: 'SPORTS_INVALID_RATE', message: 'Commission rates and the cap must be between 0% and 100%, and notice days can’t be negative.' },
  RepresentationAgreement_time_order: { code: TIME, message: 'An agreement must expire after it takes effect.' },
  AgentSplit_share_valid: { code: 'SPORTS_INVALID_RATE', message: 'An agent’s share must be between 0% and 100%.' },
  PlayingContract_amounts_valid: { code: AMOUNT, message: 'Contract values can’t be negative, guaranteed money can’t exceed the total value, and commission must be between 0% and 100%.' },
  ContractYear_amounts_valid: { code: AMOUNT, message: 'Salary and bonuses can’t be negative, and a year needs at least one pay period.' },
  ContractYear_guaranteed_within_total: { code: AMOUNT, message: 'Guaranteed pay can’t be more than that year’s total pay (base salary plus bonuses).' },
  Incentive_amount_non_negative: { code: AMOUNT, message: 'An incentive amount can’t be negative.' },
  EndorsementDeal_amounts_valid: { code: AMOUNT, message: 'Deal value can’t be negative, and commission must be between 0% and 100%.' },
  EndorsementDeal_term_order: { code: TIME, message: 'A deal term must end on or after its start.' },
  ScheduledPayment_amounts_valid: { code: AMOUNT, message: 'Commission can’t be negative or exceed the gross payment, and a waiver can’t exceed the commission.' },
  CommissionInvoice_amounts_valid: { code: 'SPORTS_INVOICE_OVERPAID', message: 'An invoice can’t be paid beyond its total, and amounts can’t be negative.' },
  CommissionInvoice_date_order: { code: TIME, message: 'An invoice can’t be due before it is issued.' },
  CommissionInvoiceLine_amounts_valid: { code: AMOUNT, message: 'Invoice line amounts can’t be negative and the quantity must be at least one.' },
  AgentPayout_total_non_negative: { code: AMOUNT, message: 'A payout can’t be negative.' },
  CommissionLedgerEntry_sign_valid: { code: 'SPORTS_INVALID_LEDGER_ENTRY', message: 'Accruals must be positive and receipts must reduce the balance owed.' },
  ClientTrustEntry_sign_valid: { code: 'SPORTS_INVALID_TRUST_ENTRY', message: 'Deposits must add money, transfers and disbursements must take it out, and an entry can’t be zero.' },
  ClientTrustEntry_balance_non_negative: { code: 'SPORTS_TRUST_OVERDRAWN', message: 'A client’s trust account can’t go below zero. Reload the balance and try again.' },
  ManagerApproval_amounts_valid: { code: AMOUNT, message: 'An approval amount can’t be negative.' },
  ManagerApproval_time_order: { code: TIME, message: 'An approval can’t expire before it is requested.' },
  AgentCertification_time_order: { code: TIME, message: 'A certification must expire after it is issued.' },
  Payment_amounts_valid: { code: AMOUNT, message: 'A payment must be positive, and refunds can’t exceed it.' },
  Refund_amount_positive: { code: AMOUNT, message: 'A refund must be a positive amount.' },
  Refund_within_payment: { code: 'SPORTS_REFUND_EXCEEDS_PAYMENT', message: 'Refunds can’t exceed what was paid, and must be in the payment’s currency.' },
  Agency_currency_code: CURRENCY,
  PlayingContract_currency_code: CURRENCY,
  ContractYear_currency_code: CURRENCY,
  Incentive_currency_code: CURRENCY,
  EndorsementDeal_currency_code: CURRENCY,
  ScheduledPayment_currency_code: CURRENCY,
  CommissionInvoice_currency_code: CURRENCY,
  CommissionInvoiceLine_currency_code: CURRENCY,
  CommissionLedgerEntry_currency_code: CURRENCY,
  ClientTrustAccount_currency_code: CURRENCY,
  ClientTrustEntry_currency_code: CURRENCY,
  TrustReconciliation_currency_code: CURRENCY,
  ForecastSnapshot_currency_code: CURRENCY,
  AgentPayout_currency_code: CURRENCY,
  Payment_currency_code: CURRENCY,
  Refund_currency_code: CURRENCY,
  RepresentationAgreement_one_open_per_athlete: { code: 'SPORTS_DUPLICATE_AGREEMENT', message: 'This athlete already has an open representation agreement.', fields: ['athlete'] },
  ContractYear_contract_season_key: { code: 'SPORTS_DUPLICATE_SEASON', message: 'That season already exists on this contract.', fields: ['contract', 'season'] },
  AgentSplit_athlete_user_key: { code: 'SPORTS_DUPLICATE_SPLIT', message: 'That agent already has a split for this athlete.', fields: ['athlete', 'user'] },
  AgentSplit_deal_user_key: { code: 'SPORTS_DUPLICATE_SPLIT', message: 'That agent already has a split on this deal.', fields: ['deal', 'user'] },
  Brand_name_key: { code: 'SPORTS_DUPLICATE_NAME', message: 'A brand with that name already exists.', fields: ['name'] },
  Team_name_league_key: { code: 'SPORTS_DUPLICATE_NAME', message: 'A team with that name already exists in that league.', fields: ['league', 'name'] },
}

type ErrorLink = {
  message?: unknown; meta?: { target?: unknown }; code?: unknown; originalError?: unknown; cause?: unknown
  // Keystone returns uncoded Prisma failures (CHECK and trigger violations) as "Prisma error" with the text here.
  extensions?: { debug?: { message?: unknown }; prisma?: { meta?: unknown } }
} | null | undefined

function chain(error: unknown) {
  const out: ErrorLink[] = []
  let current = error as ErrorLink
  for (let depth = 0; current && depth < 6; depth++) { out.push(current); current = (current.originalError ?? current.cause) as ErrorLink }
  return out
}

/** The readable, coded refusal for a known constraint violation anywhere in the error's cause chain, or null. */
export function constraintRefusal(error: unknown): { code: string; message: string } | null {
  for (const link of chain(error)) {
    const text = [
      link?.message, typeof link?.meta === 'object' ? JSON.stringify(link.meta) : '',
      link?.extensions?.debug?.message ?? '', link?.extensions?.prisma?.meta ? JSON.stringify(link.extensions.prisma.meta) : '',
    ].join(' ')
    for (const [name, rule] of Object.entries(CONSTRAINT_MESSAGES)) if (text.includes(name)) return rule
    // Prisma sometimes reports a unique violation by its fields instead of the index name.
    const listed = /Unique constraint failed on the fields: \((.*?)\)(?:\s|$)/.exec(String(link?.message || ''))?.[1]?.match(/`([^`]+)`/g)?.map(field => field.slice(1, -1))
    // Raw SQL writes surface Postgres's own detail instead: Key (event, artist)=(…) already exists.
    const keyed = /Key \((.*?)\)=\(.*\) already exists/.exec(text)?.[1]?.split(',').map(field => field.trim().replace(/^"|"$/g, ''))
    const unwrap = (field: unknown) => String(field).replace(/^lower\((.*)\)$/, '$1')
    const fields = (link?.code === 'P2002' && Array.isArray(link?.meta?.target) ? link.meta.target : listed ?? keyed)?.map(unwrap)
    if (fields?.length) {
      const target = [...fields].map(String).sort().join(',')
      const matches = Object.values(CONSTRAINT_MESSAGES).filter(rule => rule.fields && [...rule.fields].sort().join(',') === target)
      if (matches.length === 1) return matches[0]
      // Prisma names fields, not the index: when two rules share a field list, do not guess which one refused.
      if (matches.length > 1) return { code: 'SPORTS_DUPLICATE_RECORD', message: 'That record already exists. Reload and check before adding it again.' }
    }
  }
  return null
}

export function constraintGraphQLError(error: GraphQLError, refusal: { code: string; message: string }): GraphQLError {
  return new GraphQLError(refusal.message, { nodes: error.nodes, source: error.source, positions: error.positions, path: error.path, extensions: { code: refusal.code } })
}
