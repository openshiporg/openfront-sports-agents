-- Rules the app already relied on, now enforced by the database. Live data was checked read-only first: 0 violations.

-- Rates, splits and commissions are 0..100%
ALTER TABLE "Agency"
  ADD CONSTRAINT "Agency_rates_valid" CHECK ("defaultPlayingCommissionBps" BETWEEN 0 AND 10000 AND "defaultEndorsementCommissionBps" BETWEEN 0 AND 10000 AND "refundApprovalThresholdCents" >= 0 AND "fiscalYearStart" BETWEEN 1 AND 12);
ALTER TABLE "RepresentationAgreement"
  ADD CONSTRAINT "RepresentationAgreement_rates_valid" CHECK ("playingCommissionBps" BETWEEN 0 AND 10000 AND "marketingCommissionBps" BETWEEN 0 AND 10000 AND "capBps" BETWEEN 0 AND 10000 AND "terminationNoticeDays" >= 0),
  ADD CONSTRAINT "RepresentationAgreement_time_order" CHECK ("effectiveAt" IS NULL OR "expiresAt" IS NULL OR "effectiveAt" < "expiresAt");
ALTER TABLE "AgentSplit" ADD CONSTRAINT "AgentSplit_share_valid" CHECK ("shareBps" BETWEEN 0 AND 10000);

-- Deal and contract money
ALTER TABLE "PlayingContract"
  ADD CONSTRAINT "PlayingContract_amounts_valid" CHECK ("totalValueCents" >= 0 AND "guaranteedCents" >= 0 AND "signingBonusCents" >= 0 AND "guaranteedCents" <= "totalValueCents" AND "commissionBps" BETWEEN 0 AND 10000 AND "paymentTermsDays" >= 0);
ALTER TABLE "ContractYear"
  ADD CONSTRAINT "ContractYear_amounts_valid" CHECK ("baseSalaryCents" >= 0 AND "guaranteedCents" >= 0 AND "rosterBonusCents" >= 0 AND "workoutBonusCents" >= 0 AND "payPeriods" >= 1);
-- The guaranteed-pay-within-year-total rule is in 20261108170000 (live seed rows broke it here first).
ALTER TABLE "Incentive" ADD CONSTRAINT "Incentive_amount_non_negative" CHECK ("amountCents" >= 0);
ALTER TABLE "EndorsementDeal"
  ADD CONSTRAINT "EndorsementDeal_amounts_valid" CHECK ("totalValueCents" >= 0 AND "commissionBps" BETWEEN 0 AND 10000 AND "paymentTermsDays" >= 0),
  ADD CONSTRAINT "EndorsementDeal_term_order" CHECK ("termStart" IS NULL OR "termEnd" IS NULL OR "termStart" <= "termEnd");
ALTER TABLE "ScheduledPayment"
  ADD CONSTRAINT "ScheduledPayment_amounts_valid" CHECK ("grossCents" >= 0 AND "commissionBps" BETWEEN 0 AND 10000 AND "commissionCents" >= 0 AND "commissionCents" <= "grossCents" AND "waivedCents" >= 0 AND "waivedCents" <= "commissionCents" AND "remainder" >= 0);

-- Invoices: parts are not negative, paid never passes the total
ALTER TABLE "CommissionInvoice"
  ADD CONSTRAINT "CommissionInvoice_amounts_valid" CHECK ("totalCents" >= 0 AND "paidCents" >= 0 AND "paidCents" <= "totalCents"),
  ADD CONSTRAINT "CommissionInvoice_date_order" CHECK ("issuedAt" IS NULL OR "dueAt" IS NULL OR "issuedAt" <= "dueAt");
ALTER TABLE "CommissionInvoiceLine"
  ADD CONSTRAINT "CommissionInvoiceLine_amounts_valid" CHECK ("grossCents" >= 0 AND "commissionBps" BETWEEN 0 AND 10000 AND "commissionCents" >= 0 AND "quantity" >= 1 AND "unitPriceCents" >= 0 AND "feesCents" >= 0 AND "taxCents" >= 0);
ALTER TABLE "AgentPayout" ADD CONSTRAINT "AgentPayout_total_non_negative" CHECK ("totalCents" >= 0);

-- Ledger and trust account sign discipline
ALTER TABLE "CommissionLedgerEntry"
  ADD CONSTRAINT "CommissionLedgerEntry_sign_valid" CHECK (("entryType" <> 'accrual' OR "amountCents" >= 0) AND ("entryType" <> 'receipt' OR "amountCents" <= 0));
ALTER TABLE "ClientTrustEntry"
  ADD CONSTRAINT "ClientTrustEntry_sign_valid" CHECK ("amountCents" <> 0 AND ("entryType" <> 'deposit' OR "amountCents" > 0) AND ("entryType" NOT IN ('commission_transfer', 'disbursement_to_client') OR "amountCents" < 0));

ALTER TABLE "ManagerApproval"
  ADD CONSTRAINT "ManagerApproval_amounts_valid" CHECK ("amountCents" IS NULL OR "amountCents" >= 0),
  ADD CONSTRAINT "ManagerApproval_time_order" CHECK ("expiresAt" IS NULL OR "requestedAt" IS NULL OR "requestedAt" <= "expiresAt");
ALTER TABLE "AgentCertification" ADD CONSTRAINT "AgentCertification_time_order" CHECK ("issuedAt" IS NULL OR "expiresAt" IS NULL OR "issuedAt" <= "expiresAt");

-- Card payments
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amounts_valid" CHECK ("amount" > 0 AND "refundedAmount" >= 0 AND "refundedAmount" <= "amount");
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_amount_positive" CHECK ("amount" > 0);

-- ISO currency everywhere money is stored
ALTER TABLE "Agency" ADD CONSTRAINT "Agency_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "PlayingContract" ADD CONSTRAINT "PlayingContract_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "ContractYear" ADD CONSTRAINT "ContractYear_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "Incentive" ADD CONSTRAINT "Incentive_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "EndorsementDeal" ADD CONSTRAINT "EndorsementDeal_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "CommissionInvoice" ADD CONSTRAINT "CommissionInvoice_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "CommissionInvoiceLine" ADD CONSTRAINT "CommissionInvoiceLine_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "ClientTrustAccount" ADD CONSTRAINT "ClientTrustAccount_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "ClientTrustEntry" ADD CONSTRAINT "ClientTrustEntry_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "TrustReconciliation" ADD CONSTRAINT "TrustReconciliation_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "ForecastSnapshot" ADD CONSTRAINT "ForecastSnapshot_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "AgentPayout" ADD CONSTRAINT "AgentPayout_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_currency_code" CHECK ("currencyCode" ~ '^[A-Z]{3}$');

-- A client's trust account never goes below zero. The account row is locked so two concurrent entries are counted one after the other.
-- Prisma drops the constraint name from trigger errors, so the rule name leads the message.
CREATE FUNCTION sports_agents_trust_balance_non_negative() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  balance NUMERIC;
BEGIN
  IF NEW."account" IS NULL THEN RETURN NULL; END IF;
  PERFORM 1 FROM "ClientTrustAccount" WHERE "id" = NEW."account" FOR UPDATE;
  SELECT COALESCE(SUM("amountCents"), 0) INTO balance FROM "ClientTrustEntry" WHERE "account" = NEW."account";
  IF balance < 0 THEN
    RAISE EXCEPTION 'ClientTrustEntry_balance_non_negative: balance would be %', balance USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER "ClientTrustEntry_balance_non_negative"
  AFTER INSERT OR UPDATE OF "amountCents", "account" ON "ClientTrustEntry"
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION sports_agents_trust_balance_non_negative();

-- Refunds never exceed the payment, in the payment's currency (payment row locked; same pattern as the other verticals).
CREATE FUNCTION sports_agents_refund_within_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  paid RECORD;
  refunded BIGINT;
BEGIN
  IF NEW."payment" IS NULL THEN RETURN NULL; END IF;
  SELECT "amount", "currencyCode" INTO paid FROM "Payment" WHERE "id" = NEW."payment" FOR UPDATE;
  IF NOT FOUND THEN RETURN NULL; END IF;
  IF NEW."currencyCode" <> paid."currencyCode" THEN
    RAISE EXCEPTION 'Refund_within_payment: refund currency % differs from payment currency %', NEW."currencyCode", paid."currencyCode" USING ERRCODE = '23514';
  END IF;
  SELECT COALESCE(SUM("amount"), 0) INTO refunded FROM "Refund"
    WHERE "payment" = NEW."payment" AND "status" IN ('processing', 'unknown', 'succeeded');
  IF refunded > paid."amount" THEN
    RAISE EXCEPTION 'Refund_within_payment: refunds % exceed payment %', refunded, paid."amount" USING ERRCODE = '23514';
  END IF;
  RETURN NULL;
END;
$$;
CREATE CONSTRAINT TRIGGER "Refund_within_payment"
  AFTER INSERT OR UPDATE OF "amount", "status", "payment", "currencyCode" ON "Refund"
  DEFERRABLE INITIALLY IMMEDIATE
  FOR EACH ROW EXECUTE FUNCTION sports_agents_refund_within_payment();

-- Uniqueness. Written as partial indexes (WHERE parent IS NOT NULL) or on expressions so Prisma, which cannot express them, leaves them alone.
CREATE UNIQUE INDEX "RepresentationAgreement_one_open_per_athlete" ON "RepresentationAgreement"("athlete") WHERE "athlete" IS NOT NULL AND "status" IN ('draft', 'sent', 'signed', 'filed_with_union', 'active');
CREATE UNIQUE INDEX "ContractYear_contract_season_key" ON "ContractYear"("contract", "season") WHERE "contract" IS NOT NULL;
CREATE UNIQUE INDEX "AgentSplit_athlete_user_key" ON "AgentSplit"("athlete", "user") WHERE "athlete" IS NOT NULL AND "user" IS NOT NULL;
CREATE UNIQUE INDEX "AgentSplit_deal_user_key" ON "AgentSplit"("deal", "user") WHERE "deal" IS NOT NULL AND "user" IS NOT NULL;
CREATE UNIQUE INDEX "Brand_name_key" ON "Brand"(lower("name"));
CREATE UNIQUE INDEX "Team_name_league_key" ON "Team"(lower("name"), "league");
