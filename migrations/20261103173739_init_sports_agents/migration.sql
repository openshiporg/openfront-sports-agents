/*
  Warnings:

  - You are about to drop the column `canCreateTodos` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the column `canManageAllTodos` on the `Role` table. All the data in the column will be lost.
  - You are about to drop the `Todo` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `TodoImage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_Todo_todoImages` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "UserOnboardingStatusType" AS ENUM ('not_started', 'in_progress', 'completed', 'dismissed');

-- CreateEnum
CREATE TYPE "AgentCertificationBodyType" AS ENUM ('NFLPA', 'NBPA', 'MLBPA', 'NHLPA', 'MLSPA', 'FIFA', 'NCAA_NIL_STATE', 'other');

-- CreateEnum
CREATE TYPE "AgentCertificationStatusType" AS ENUM ('active', 'expired', 'suspended');

-- CreateEnum
CREATE TYPE "AthleteLeagueType" AS ENUM ('NFL', 'NBA', 'WNBA', 'MLB', 'NHL', 'MLS', 'NWSL', 'NCAA', 'Other');

-- CreateEnum
CREATE TYPE "AthleteStatusType" AS ENUM ('prospect', 'recruiting', 'client', 'former', 'lost');

-- CreateEnum
CREATE TYPE "AthleteRecruitingStageType" AS ENUM ('identified', 'contacted', 'meeting', 'pitched', 'verbal', 'signed', 'lost');

-- CreateEnum
CREATE TYPE "RepresentationAgreementScopeType" AS ENUM ('playing', 'marketing', 'both');

-- CreateEnum
CREATE TYPE "RepresentationAgreementStatusType" AS ENUM ('draft', 'sent', 'signed', 'filed_with_union', 'active', 'terminated', 'expired');

-- CreateEnum
CREATE TYPE "InteractionKindType" AS ENUM ('call', 'meeting', 'email', 'text', 'visit', 'note');

-- CreateEnum
CREATE TYPE "PlayingContractContractTypeType" AS ENUM ('rookie_scale', 'veteran', 'extension', 'two_way', 'minor_league', 'college_nil', 'other');

-- CreateEnum
CREATE TYPE "PlayingContractStatusType" AS ENUM ('negotiating', 'signed', 'active', 'completed', 'terminated', 'released');

-- CreateEnum
CREATE TYPE "ContractYearPayScheduleType" AS ENUM ('game_checks', 'semi_monthly', 'lump_sum');

-- CreateEnum
CREATE TYPE "IncentiveStatusType" AS ENUM ('pending', 'earned', 'not_earned');

-- CreateEnum
CREATE TYPE "EndorsementDealStatusType" AS ENUM ('prospect', 'negotiating', 'signed', 'active', 'completed', 'terminated');

-- CreateEnum
CREATE TYPE "DeliverableKindType" AS ENUM ('social_post', 'appearance', 'photo_shoot', 'commercial', 'autograph_session', 'other');

-- CreateEnum
CREATE TYPE "DeliverableStatusType" AS ENUM ('scheduled', 'completed', 'missed', 'waived');

-- CreateEnum
CREATE TYPE "ScheduledPaymentStatusType" AS ENUM ('scheduled', 'received', 'late', 'waived');

-- CreateEnum
CREATE TYPE "CommissionInvoiceStatusType" AS ENUM ('draft', 'sent', 'partially_paid', 'paid', 'void', 'written_off');

-- CreateEnum
CREATE TYPE "CommissionLedgerEntryEntryTypeType" AS ENUM ('accrual', 'invoice', 'receipt', 'split_to_agent', 'reversal', 'write_off');

-- CreateEnum
CREATE TYPE "ClientTrustEntryEntryTypeType" AS ENUM ('deposit', 'commission_transfer', 'disbursement_to_client', 'reversal');

-- CreateEnum
CREATE TYPE "TaskStatusType" AS ENUM ('open', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "TaskPriorityType" AS ENUM ('normal', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "PaymentCollectionDescriptionType" AS ENUM ('default', 'refund');

-- DropForeignKey
ALTER TABLE "Todo" DROP CONSTRAINT "Todo_assignedTo_fkey";

-- DropForeignKey
ALTER TABLE "_Todo_todoImages" DROP CONSTRAINT "_Todo_todoImages_A_fkey";

-- DropForeignKey
ALTER TABLE "_Todo_todoImages" DROP CONSTRAINT "_Todo_todoImages_B_fkey";

-- AlterTable
ALTER TABLE "Role" DROP COLUMN "canCreateTodos",
DROP COLUMN "canManageAllTodos",
ADD COLUMN     "canIssueRefunds" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageAthletes" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageCommissions" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageContracts" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageEndorsements" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageOnboarding" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManagePayments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canManageTrust" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadAudit" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canReadPayments" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "canViewAllClients" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "onboardingStatus" "UserOnboardingStatusType" DEFAULT 'not_started',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- DropTable
DROP TABLE "Todo";

-- DropTable
DROP TABLE "TodoImage";

-- DropTable
DROP TABLE "_Todo_todoImages";

-- CreateTable
CREATE TABLE "Agency" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "defaultPlayingCommissionBps" INTEGER DEFAULT 300,
    "defaultEndorsementCommissionBps" INTEGER DEFAULT 1500,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "fiscalYearStart" INTEGER DEFAULT 1,
    "refundApprovalThresholdCents" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCertification" (
    "id" TEXT NOT NULL,
    "user" TEXT,
    "body" "AgentCertificationBodyType" DEFAULT 'NFLPA',
    "number" TEXT NOT NULL DEFAULT '',
    "issuedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "status" "AgentCertificationStatusType" DEFAULT 'active',
    "document" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentCertification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "league" TEXT NOT NULL DEFAULT '',
    "city" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Athlete" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL DEFAULT '',
    "preferredName" TEXT NOT NULL DEFAULT '',
    "sport" TEXT NOT NULL DEFAULT '',
    "league" "AthleteLeagueType" DEFAULT 'NFL',
    "position" TEXT NOT NULL DEFAULT '',
    "team" TEXT,
    "dateOfBirth" DATE,
    "status" "AthleteStatusType" DEFAULT 'prospect',
    "leadAgent" TEXT,
    "portalUser" TEXT,
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "representationStartedAt" TIMESTAMP(3),
    "socialHandles" JSONB,
    "followerCounts" JSONB,
    "marketabilityNotes" TEXT NOT NULL DEFAULT '',
    "image" TEXT NOT NULL DEFAULT '',
    "eligibility" JSONB,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "recruitingStage" "AthleteRecruitingStageType" DEFAULT 'identified',
    "contactAllowedFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepresentationAgreement" (
    "id" TEXT NOT NULL,
    "athlete" TEXT,
    "agent" TEXT,
    "scope" "RepresentationAgreementScopeType" DEFAULT 'playing',
    "playingCommissionBps" INTEGER DEFAULT 300,
    "marketingCommissionBps" INTEGER DEFAULT 1500,
    "capBps" INTEGER DEFAULT 300,
    "effectiveAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "terminationNoticeDays" INTEGER DEFAULT 30,
    "status" "RepresentationAgreementStatusType" DEFAULT 'draft',
    "signedDocument" TEXT,
    "filedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepresentationAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "org" TEXT NOT NULL DEFAULT '',
    "role" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "doNotContact" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "category" TEXT NOT NULL DEFAULT '',
    "website" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Interaction" (
    "id" TEXT NOT NULL,
    "athlete" TEXT,
    "contact" TEXT,
    "brand" TEXT,
    "user" TEXT,
    "kind" "InteractionKindType" DEFAULT 'call',
    "occurredAt" TIMESTAMP(3),
    "summary" TEXT NOT NULL DEFAULT '',
    "nextStepAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayingContract" (
    "id" TEXT NOT NULL,
    "athlete" TEXT,
    "team" TEXT,
    "league" TEXT NOT NULL DEFAULT '',
    "contractType" "PlayingContractContractTypeType" DEFAULT 'rookie_scale',
    "signedAt" TIMESTAMP(3),
    "startSeason" TEXT NOT NULL DEFAULT '',
    "endSeason" TEXT NOT NULL DEFAULT '',
    "totalValueCents" INTEGER DEFAULT 0,
    "guaranteedCents" INTEGER DEFAULT 0,
    "signingBonusCents" INTEGER DEFAULT 0,
    "status" "PlayingContractStatusType" DEFAULT 'negotiating',
    "document" TEXT,
    "commissionBps" INTEGER DEFAULT 0,
    "representationAgreement" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayingContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractYear" (
    "id" TEXT NOT NULL,
    "contract" TEXT,
    "season" TEXT NOT NULL DEFAULT '',
    "baseSalaryCents" INTEGER DEFAULT 0,
    "guaranteedCents" INTEGER DEFAULT 0,
    "rosterBonusCents" INTEGER DEFAULT 0,
    "workoutBonusCents" INTEGER DEFAULT 0,
    "payPeriods" INTEGER DEFAULT 17,
    "paySchedule" "ContractYearPayScheduleType" DEFAULT 'game_checks',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incentive" (
    "id" TEXT NOT NULL,
    "contract" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "amountCents" INTEGER DEFAULT 0,
    "likelyToBeEarned" BOOLEAN NOT NULL DEFAULT false,
    "status" "IncentiveStatusType" DEFAULT 'pending',
    "earnedAt" TIMESTAMP(3),
    "evidence" TEXT NOT NULL DEFAULT '',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incentive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EndorsementDeal" (
    "id" TEXT NOT NULL,
    "athlete" TEXT,
    "brand" TEXT,
    "owner" TEXT,
    "status" "EndorsementDealStatusType" DEFAULT 'prospect',
    "termStart" TIMESTAMP(3),
    "termEnd" TIMESTAMP(3),
    "totalValueCents" INTEGER DEFAULT 0,
    "commissionBps" INTEGER DEFAULT 1500,
    "exclusivityCategory" TEXT NOT NULL DEFAULT '',
    "territory" TEXT NOT NULL DEFAULT '',
    "document" TEXT,
    "paymentTerms" TEXT NOT NULL DEFAULT '',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EndorsementDeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deliverable" (
    "id" TEXT NOT NULL,
    "deal" TEXT,
    "kind" "DeliverableKindType" DEFAULT 'social_post',
    "dueAt" TIMESTAMP(3),
    "status" "DeliverableStatusType" DEFAULT 'scheduled',
    "completedAt" TIMESTAMP(3),
    "proofLink" TEXT NOT NULL DEFAULT '',
    "proof" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Deliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduledPayment" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT NOT NULL DEFAULT '',
    "contractYear" TEXT,
    "endorsementDeal" TEXT,
    "incentive" TEXT,
    "athlete" TEXT,
    "dueAt" TIMESTAMP(3),
    "grossCents" INTEGER DEFAULT 0,
    "commissionBps" INTEGER DEFAULT 0,
    "commissionCents" INTEGER DEFAULT 0,
    "remainder" INTEGER DEFAULT 0,
    "receivedAt" TIMESTAMP(3),
    "status" "ScheduledPaymentStatusType" DEFAULT 'scheduled',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "invoice" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScheduledPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionInvoice" (
    "id" TEXT NOT NULL,
    "athlete" TEXT,
    "number" TEXT NOT NULL DEFAULT '',
    "issuedAt" TIMESTAMP(3),
    "dueAt" TIMESTAMP(3),
    "totalCents" INTEGER DEFAULT 0,
    "paidCents" INTEGER DEFAULT 0,
    "status" "CommissionInvoiceStatusType" DEFAULT 'draft',
    "paymentCollection" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoice" TEXT,
    "scheduledPayment" TEXT,
    "description" TEXT NOT NULL DEFAULT '',
    "grossCents" INTEGER DEFAULT 0,
    "commissionBps" INTEGER DEFAULT 0,
    "commissionCents" INTEGER DEFAULT 0,
    "quantity" INTEGER DEFAULT 1,
    "unitPriceCents" INTEGER DEFAULT 0,
    "feesCents" INTEGER DEFAULT 0,
    "taxCents" INTEGER DEFAULT 0,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLedgerEntry" (
    "id" TEXT NOT NULL,
    "entryKey" TEXT NOT NULL DEFAULT '',
    "athlete" TEXT,
    "invoice" TEXT,
    "scheduledPayment" TEXT,
    "entryType" "CommissionLedgerEntryEntryTypeType" DEFAULT 'accrual',
    "amountCents" BIGINT NOT NULL,
    "payeeUser" TEXT,
    "reverses" TEXT,
    "reversalKey" TEXT,
    "reason" TEXT NOT NULL DEFAULT '',
    "preparedBy" TEXT,
    "approvedBy" TEXT,
    "occurredAt" TIMESTAMP(3),
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentSplit" (
    "id" TEXT NOT NULL,
    "athlete" TEXT,
    "deal" TEXT,
    "user" TEXT,
    "shareBps" INTEGER DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTrustAccount" (
    "id" TEXT NOT NULL,
    "athlete" TEXT,
    "name" TEXT NOT NULL DEFAULT '',
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientTrustAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientTrustEntry" (
    "id" TEXT NOT NULL,
    "account" TEXT,
    "athlete" TEXT,
    "invoice" TEXT,
    "entryType" "ClientTrustEntryEntryTypeType" DEFAULT 'deposit',
    "amountCents" BIGINT NOT NULL,
    "reference" TEXT NOT NULL DEFAULT '',
    "occurredAt" TIMESTAMP(3),
    "reverses" TEXT,
    "reversalKey" TEXT,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientTrustEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "athlete" TEXT,
    "contract" TEXT,
    "deal" TEXT,
    "agreement" TEXT,
    "kind" TEXT NOT NULL DEFAULT '',
    "version" INTEGER DEFAULT 1,
    "sha256" TEXT NOT NULL DEFAULT '',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "uploadedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "athlete" TEXT,
    "deal" TEXT,
    "contract" TEXT,
    "assignee" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "TaskStatusType" DEFAULT 'open',
    "priority" "TaskPriorityType" DEFAULT 'normal',
    "autoKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actor" TEXT,
    "action" TEXT NOT NULL DEFAULT '',
    "targetList" TEXT NOT NULL DEFAULT '',
    "targetId" TEXT NOT NULL DEFAULT '',
    "before" JSONB,
    "after" JSONB,
    "reason" TEXT NOT NULL DEFAULT '',
    "requestId" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentProvider" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "code" TEXT NOT NULL DEFAULT '',
    "isInstalled" BOOLEAN NOT NULL DEFAULT true,
    "credentials" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "createPaymentFunction" TEXT NOT NULL DEFAULT '',
    "capturePaymentFunction" TEXT NOT NULL DEFAULT '',
    "refundPaymentFunction" TEXT NOT NULL DEFAULT '',
    "getPaymentStatusFunction" TEXT NOT NULL DEFAULT '',
    "generatePaymentLinkFunction" TEXT NOT NULL DEFAULT '',
    "handleWebhookFunction" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentCollection" (
    "id" TEXT NOT NULL,
    "description" "PaymentCollectionDescriptionType" DEFAULT 'default',
    "amount" INTEGER NOT NULL,
    "authorizedAmount" INTEGER DEFAULT 0,
    "refundedAmount" INTEGER DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSession" (
    "id" TEXT NOT NULL,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "isInitiated" BOOLEAN NOT NULL DEFAULT false,
    "amount" INTEGER NOT NULL,
    "data" JSONB DEFAULT '{}',
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "paymentCollection" TEXT,
    "paymentProvider" TEXT,
    "paymentAuthorizedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "reservedAt" TIMESTAMP(3),
    "refundedAmount" INTEGER DEFAULT 0,
    "amount" INTEGER NOT NULL,
    "data" JSONB,
    "currencyCode" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "paymentMethod" TEXT DEFAULT 'credit_card',
    "paymentProvider" TEXT,
    "providerPaymentId" TEXT NOT NULL DEFAULT '',
    "cardLast4" TEXT NOT NULL DEFAULT '',
    "cardBrand" TEXT NOT NULL DEFAULT '',
    "tipAmount" INTEGER DEFAULT 0,
    "isSplitPayment" BOOLEAN NOT NULL DEFAULT false,
    "splitPaymentIndex" INTEGER,
    "splitTotal" INTEGER,
    "processedAt" TIMESTAMP(3),
    "errorMessage" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "order" TEXT,
    "paymentCollection" TEXT,
    "processedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Refund" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "amount" INTEGER NOT NULL,
    "currencyCode" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'processing',
    "reason" TEXT NOT NULL DEFAULT '',
    "providerRefundId" TEXT NOT NULL DEFAULT '',
    "providerData" JSONB,
    "processedAt" TIMESTAMP(3),
    "payment" TEXT,
    "order" TEXT,
    "requestedBy" TEXT,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Refund_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentWebhookEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL DEFAULT '',
    "providerCode" TEXT NOT NULL DEFAULT '',
    "providerEventId" TEXT NOT NULL DEFAULT '',
    "eventType" TEXT NOT NULL DEFAULT '',
    "status" TEXT DEFAULT 'received',
    "payload" JSONB,
    "rawBody" TEXT NOT NULL DEFAULT '',
    "error" TEXT NOT NULL DEFAULT '',
    "attempts" INTEGER DEFAULT 0,
    "receivedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "payment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyKey" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL DEFAULT '',
    "requestMethod" TEXT NOT NULL DEFAULT '',
    "requestParams" JSONB,
    "requestPath" TEXT NOT NULL DEFAULT '',
    "responseCode" INTEGER,
    "responseBody" JSONB,
    "recoveryPoint" TEXT NOT NULL DEFAULT 'started',
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_Athlete_supportStaff" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Athlete_contact_athletes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_Brand_contacts" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "AgentCertification_user_idx" ON "AgentCertification"("user");

-- CreateIndex
CREATE INDEX "AgentCertification_document_idx" ON "AgentCertification"("document");

-- CreateIndex
CREATE INDEX "Athlete_team_idx" ON "Athlete"("team");

-- CreateIndex
CREATE INDEX "Athlete_leadAgent_idx" ON "Athlete"("leadAgent");

-- CreateIndex
CREATE INDEX "Athlete_portalUser_idx" ON "Athlete"("portalUser");

-- CreateIndex
CREATE INDEX "RepresentationAgreement_athlete_idx" ON "RepresentationAgreement"("athlete");

-- CreateIndex
CREATE INDEX "RepresentationAgreement_agent_idx" ON "RepresentationAgreement"("agent");

-- CreateIndex
CREATE INDEX "RepresentationAgreement_signedDocument_idx" ON "RepresentationAgreement"("signedDocument");

-- CreateIndex
CREATE INDEX "Interaction_athlete_idx" ON "Interaction"("athlete");

-- CreateIndex
CREATE INDEX "Interaction_contact_idx" ON "Interaction"("contact");

-- CreateIndex
CREATE INDEX "Interaction_brand_idx" ON "Interaction"("brand");

-- CreateIndex
CREATE INDEX "Interaction_user_idx" ON "Interaction"("user");

-- CreateIndex
CREATE INDEX "PlayingContract_athlete_idx" ON "PlayingContract"("athlete");

-- CreateIndex
CREATE INDEX "PlayingContract_team_idx" ON "PlayingContract"("team");

-- CreateIndex
CREATE INDEX "PlayingContract_document_idx" ON "PlayingContract"("document");

-- CreateIndex
CREATE INDEX "PlayingContract_representationAgreement_idx" ON "PlayingContract"("representationAgreement");

-- CreateIndex
CREATE INDEX "ContractYear_contract_idx" ON "ContractYear"("contract");

-- CreateIndex
CREATE INDEX "Incentive_contract_idx" ON "Incentive"("contract");

-- CreateIndex
CREATE INDEX "EndorsementDeal_athlete_idx" ON "EndorsementDeal"("athlete");

-- CreateIndex
CREATE INDEX "EndorsementDeal_brand_idx" ON "EndorsementDeal"("brand");

-- CreateIndex
CREATE INDEX "EndorsementDeal_owner_idx" ON "EndorsementDeal"("owner");

-- CreateIndex
CREATE INDEX "EndorsementDeal_document_idx" ON "EndorsementDeal"("document");

-- CreateIndex
CREATE INDEX "Deliverable_deal_idx" ON "Deliverable"("deal");

-- CreateIndex
CREATE INDEX "Deliverable_proof_idx" ON "Deliverable"("proof");

-- CreateIndex
CREATE UNIQUE INDEX "ScheduledPayment_sourceKey_key" ON "ScheduledPayment"("sourceKey");

-- CreateIndex
CREATE INDEX "ScheduledPayment_contractYear_idx" ON "ScheduledPayment"("contractYear");

-- CreateIndex
CREATE INDEX "ScheduledPayment_endorsementDeal_idx" ON "ScheduledPayment"("endorsementDeal");

-- CreateIndex
CREATE INDEX "ScheduledPayment_incentive_idx" ON "ScheduledPayment"("incentive");

-- CreateIndex
CREATE INDEX "ScheduledPayment_athlete_idx" ON "ScheduledPayment"("athlete");

-- CreateIndex
CREATE INDEX "ScheduledPayment_invoice_idx" ON "ScheduledPayment"("invoice");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionInvoice_number_key" ON "CommissionInvoice"("number");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionInvoice_paymentCollection_key" ON "CommissionInvoice"("paymentCollection");

-- CreateIndex
CREATE INDEX "CommissionInvoice_athlete_idx" ON "CommissionInvoice"("athlete");

-- CreateIndex
CREATE INDEX "CommissionInvoiceLine_invoice_idx" ON "CommissionInvoiceLine"("invoice");

-- CreateIndex
CREATE INDEX "CommissionInvoiceLine_scheduledPayment_idx" ON "CommissionInvoiceLine"("scheduledPayment");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLedgerEntry_entryKey_key" ON "CommissionLedgerEntry"("entryKey");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionLedgerEntry_reversalKey_key" ON "CommissionLedgerEntry"("reversalKey");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_athlete_idx" ON "CommissionLedgerEntry"("athlete");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_invoice_idx" ON "CommissionLedgerEntry"("invoice");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_scheduledPayment_idx" ON "CommissionLedgerEntry"("scheduledPayment");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_payeeUser_idx" ON "CommissionLedgerEntry"("payeeUser");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_reverses_idx" ON "CommissionLedgerEntry"("reverses");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_preparedBy_idx" ON "CommissionLedgerEntry"("preparedBy");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_approvedBy_idx" ON "CommissionLedgerEntry"("approvedBy");

-- CreateIndex
CREATE INDEX "AgentSplit_athlete_idx" ON "AgentSplit"("athlete");

-- CreateIndex
CREATE INDEX "AgentSplit_deal_idx" ON "AgentSplit"("deal");

-- CreateIndex
CREATE INDEX "AgentSplit_user_idx" ON "AgentSplit"("user");

-- CreateIndex
CREATE INDEX "ClientTrustAccount_athlete_idx" ON "ClientTrustAccount"("athlete");

-- CreateIndex
CREATE UNIQUE INDEX "ClientTrustEntry_reversalKey_key" ON "ClientTrustEntry"("reversalKey");

-- CreateIndex
CREATE INDEX "ClientTrustEntry_account_idx" ON "ClientTrustEntry"("account");

-- CreateIndex
CREATE INDEX "ClientTrustEntry_athlete_idx" ON "ClientTrustEntry"("athlete");

-- CreateIndex
CREATE INDEX "ClientTrustEntry_invoice_idx" ON "ClientTrustEntry"("invoice");

-- CreateIndex
CREATE INDEX "ClientTrustEntry_reverses_idx" ON "ClientTrustEntry"("reverses");

-- CreateIndex
CREATE INDEX "Document_athlete_idx" ON "Document"("athlete");

-- CreateIndex
CREATE INDEX "Document_contract_idx" ON "Document"("contract");

-- CreateIndex
CREATE INDEX "Document_deal_idx" ON "Document"("deal");

-- CreateIndex
CREATE INDEX "Document_agreement_idx" ON "Document"("agreement");

-- CreateIndex
CREATE INDEX "Document_uploadedBy_idx" ON "Document"("uploadedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Task_autoKey_key" ON "Task"("autoKey");

-- CreateIndex
CREATE INDEX "Task_athlete_idx" ON "Task"("athlete");

-- CreateIndex
CREATE INDEX "Task_deal_idx" ON "Task"("deal");

-- CreateIndex
CREATE INDEX "Task_contract_idx" ON "Task"("contract");

-- CreateIndex
CREATE INDEX "Task_assignee_idx" ON "Task"("assignee");

-- CreateIndex
CREATE INDEX "AuditEvent_actor_idx" ON "AuditEvent"("actor");

-- CreateIndex
CREATE INDEX "AuditEvent_requestId_idx" ON "AuditEvent"("requestId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentProvider_code_key" ON "PaymentProvider"("code");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSession_idempotencyKey_key" ON "PaymentSession"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PaymentSession_paymentCollection_idx" ON "PaymentSession"("paymentCollection");

-- CreateIndex
CREATE INDEX "PaymentSession_paymentProvider_idx" ON "PaymentSession"("paymentProvider");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Payment_paymentProvider_idx" ON "Payment"("paymentProvider");

-- CreateIndex
CREATE INDEX "Payment_order_idx" ON "Payment"("order");

-- CreateIndex
CREATE INDEX "Payment_paymentCollection_idx" ON "Payment"("paymentCollection");

-- CreateIndex
CREATE INDEX "Payment_processedBy_idx" ON "Payment"("processedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Refund_idempotencyKey_key" ON "Refund"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Refund_payment_idx" ON "Refund"("payment");

-- CreateIndex
CREATE INDEX "Refund_order_idx" ON "Refund"("order");

-- CreateIndex
CREATE INDEX "Refund_requestedBy_idx" ON "Refund"("requestedBy");

-- CreateIndex
CREATE INDEX "Refund_approvedBy_idx" ON "Refund"("approvedBy");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentWebhookEvent_eventKey_key" ON "PaymentWebhookEvent"("eventKey");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_providerCode_idx" ON "PaymentWebhookEvent"("providerCode");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_providerEventId_idx" ON "PaymentWebhookEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_eventType_idx" ON "PaymentWebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_receivedAt_idx" ON "PaymentWebhookEvent"("receivedAt");

-- CreateIndex
CREATE INDEX "PaymentWebhookEvent_payment_idx" ON "PaymentWebhookEvent"("payment");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyKey_idempotencyKey_key" ON "IdempotencyKey"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "_Athlete_supportStaff_AB_unique" ON "_Athlete_supportStaff"("A", "B");

-- CreateIndex
CREATE INDEX "_Athlete_supportStaff_B_index" ON "_Athlete_supportStaff"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Athlete_contact_athletes_AB_unique" ON "_Athlete_contact_athletes"("A", "B");

-- CreateIndex
CREATE INDEX "_Athlete_contact_athletes_B_index" ON "_Athlete_contact_athletes"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_Brand_contacts_AB_unique" ON "_Brand_contacts"("A", "B");

-- CreateIndex
CREATE INDEX "_Brand_contacts_B_index" ON "_Brand_contacts"("B");

-- AddForeignKey
ALTER TABLE "AgentCertification" ADD CONSTRAINT "AgentCertification_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentCertification" ADD CONSTRAINT "AgentCertification_document_fkey" FOREIGN KEY ("document") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_team_fkey" FOREIGN KEY ("team") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_leadAgent_fkey" FOREIGN KEY ("leadAgent") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Athlete" ADD CONSTRAINT "Athlete_portalUser_fkey" FOREIGN KEY ("portalUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentationAgreement" ADD CONSTRAINT "RepresentationAgreement_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentationAgreement" ADD CONSTRAINT "RepresentationAgreement_agent_fkey" FOREIGN KEY ("agent") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepresentationAgreement" ADD CONSTRAINT "RepresentationAgreement_signedDocument_fkey" FOREIGN KEY ("signedDocument") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_contact_fkey" FOREIGN KEY ("contact") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_brand_fkey" FOREIGN KEY ("brand") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Interaction" ADD CONSTRAINT "Interaction_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayingContract" ADD CONSTRAINT "PlayingContract_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayingContract" ADD CONSTRAINT "PlayingContract_team_fkey" FOREIGN KEY ("team") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayingContract" ADD CONSTRAINT "PlayingContract_document_fkey" FOREIGN KEY ("document") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayingContract" ADD CONSTRAINT "PlayingContract_representationAgreement_fkey" FOREIGN KEY ("representationAgreement") REFERENCES "RepresentationAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractYear" ADD CONSTRAINT "ContractYear_contract_fkey" FOREIGN KEY ("contract") REFERENCES "PlayingContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incentive" ADD CONSTRAINT "Incentive_contract_fkey" FOREIGN KEY ("contract") REFERENCES "PlayingContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndorsementDeal" ADD CONSTRAINT "EndorsementDeal_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndorsementDeal" ADD CONSTRAINT "EndorsementDeal_brand_fkey" FOREIGN KEY ("brand") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndorsementDeal" ADD CONSTRAINT "EndorsementDeal_owner_fkey" FOREIGN KEY ("owner") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EndorsementDeal" ADD CONSTRAINT "EndorsementDeal_document_fkey" FOREIGN KEY ("document") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_deal_fkey" FOREIGN KEY ("deal") REFERENCES "EndorsementDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deliverable" ADD CONSTRAINT "Deliverable_proof_fkey" FOREIGN KEY ("proof") REFERENCES "Document"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_contractYear_fkey" FOREIGN KEY ("contractYear") REFERENCES "ContractYear"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_endorsementDeal_fkey" FOREIGN KEY ("endorsementDeal") REFERENCES "EndorsementDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_incentive_fkey" FOREIGN KEY ("incentive") REFERENCES "Incentive"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledPayment" ADD CONSTRAINT "ScheduledPayment_invoice_fkey" FOREIGN KEY ("invoice") REFERENCES "CommissionInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionInvoice" ADD CONSTRAINT "CommissionInvoice_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionInvoice" ADD CONSTRAINT "CommissionInvoice_paymentCollection_fkey" FOREIGN KEY ("paymentCollection") REFERENCES "PaymentCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionInvoiceLine" ADD CONSTRAINT "CommissionInvoiceLine_invoice_fkey" FOREIGN KEY ("invoice") REFERENCES "CommissionInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionInvoiceLine" ADD CONSTRAINT "CommissionInvoiceLine_scheduledPayment_fkey" FOREIGN KEY ("scheduledPayment") REFERENCES "ScheduledPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_invoice_fkey" FOREIGN KEY ("invoice") REFERENCES "CommissionInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_scheduledPayment_fkey" FOREIGN KEY ("scheduledPayment") REFERENCES "ScheduledPayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_payeeUser_fkey" FOREIGN KEY ("payeeUser") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_reverses_fkey" FOREIGN KEY ("reverses") REFERENCES "CommissionLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_preparedBy_fkey" FOREIGN KEY ("preparedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSplit" ADD CONSTRAINT "AgentSplit_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSplit" ADD CONSTRAINT "AgentSplit_deal_fkey" FOREIGN KEY ("deal") REFERENCES "EndorsementDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentSplit" ADD CONSTRAINT "AgentSplit_user_fkey" FOREIGN KEY ("user") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTrustAccount" ADD CONSTRAINT "ClientTrustAccount_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTrustEntry" ADD CONSTRAINT "ClientTrustEntry_account_fkey" FOREIGN KEY ("account") REFERENCES "ClientTrustAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTrustEntry" ADD CONSTRAINT "ClientTrustEntry_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTrustEntry" ADD CONSTRAINT "ClientTrustEntry_invoice_fkey" FOREIGN KEY ("invoice") REFERENCES "CommissionInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientTrustEntry" ADD CONSTRAINT "ClientTrustEntry_reverses_fkey" FOREIGN KEY ("reverses") REFERENCES "ClientTrustEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_contract_fkey" FOREIGN KEY ("contract") REFERENCES "PlayingContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_deal_fkey" FOREIGN KEY ("deal") REFERENCES "EndorsementDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_agreement_fkey" FOREIGN KEY ("agreement") REFERENCES "RepresentationAgreement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_athlete_fkey" FOREIGN KEY ("athlete") REFERENCES "Athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_deal_fkey" FOREIGN KEY ("deal") REFERENCES "EndorsementDeal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_contract_fkey" FOREIGN KEY ("contract") REFERENCES "PlayingContract"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assignee_fkey" FOREIGN KEY ("assignee") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actor_fkey" FOREIGN KEY ("actor") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_paymentCollection_fkey" FOREIGN KEY ("paymentCollection") REFERENCES "PaymentCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSession" ADD CONSTRAINT "PaymentSession_paymentProvider_fkey" FOREIGN KEY ("paymentProvider") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentProvider_fkey" FOREIGN KEY ("paymentProvider") REFERENCES "PaymentProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_order_fkey" FOREIGN KEY ("order") REFERENCES "CommissionInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentCollection_fkey" FOREIGN KEY ("paymentCollection") REFERENCES "PaymentCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_order_fkey" FOREIGN KEY ("order") REFERENCES "CommissionInvoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_approvedBy_fkey" FOREIGN KEY ("approvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentWebhookEvent" ADD CONSTRAINT "PaymentWebhookEvent_payment_fkey" FOREIGN KEY ("payment") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Athlete_supportStaff" ADD CONSTRAINT "_Athlete_supportStaff_A_fkey" FOREIGN KEY ("A") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Athlete_supportStaff" ADD CONSTRAINT "_Athlete_supportStaff_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Athlete_contact_athletes" ADD CONSTRAINT "_Athlete_contact_athletes_A_fkey" FOREIGN KEY ("A") REFERENCES "Athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Athlete_contact_athletes" ADD CONSTRAINT "_Athlete_contact_athletes_B_fkey" FOREIGN KEY ("B") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Brand_contacts" ADD CONSTRAINT "_Brand_contacts_A_fkey" FOREIGN KEY ("A") REFERENCES "Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_Brand_contacts" ADD CONSTRAINT "_Brand_contacts_B_fkey" FOREIGN KEY ("B") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;
