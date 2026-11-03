# Sports agency implementation lineage

Source of truth: batch-7/sports-agents/DESIGN.md and batch-7/CONVENTIONS.md.

- C01/C02: Restaurant PaymentProvider, PaymentCollection, PaymentSession, Payment, Refund, PaymentWebhookEvent and IdempotencyKey models. Preserve locked transactional writes and provider selectors; adapt Cart/RestaurantOrder relations to CommissionInvoice and order permission to commission permission. Preserve integer minor units and USD currency default; remove Restaurant StoreSettings currency lookup.
- C19: Restaurant utils/idempotency.ts copied unchanged: canonical request fingerprints, unique request key, reject changed payload. Domain commands must bind actor and scope and reauthorize on replay.
- C18: Real Estate CommissionLedgerEntry, Law Firm models/trust.ts and Sportsbook domain/ledger.ts inspected. Adapt append-only signed BigInt entries and exact-once reversal identity to athlete commission and trust policy. Sportsbook Core 8 ORM is not reused in this Core 6 application.
- C20: Restaurant utils/audit.ts and managerApproval.ts inspected. Agency audit envelope uses actor/action/targetList/targetId/before/after/reason/requestId. No public create/update/delete.
- Client privacy: Law Firm documents.ts and Construction mutations/documents.ts inspected. Private document writes are server-only; scope uses lead-agent/support-staff athlete assignment. Storage key has no public field read access.
- Concurrency: Gym mutations/classCapacity.ts inspected. Reuse transaction advisory-lock pattern for agreement exclusivity, scheduling, accrual, invoice and trust posting; no seat capacity exists in this vertical.

Catalog relocated to ../fleet-docs/OPENFRONT-FEATURES-CATALOG.md and OPENFRONT-FEATURES-SOURCE-INDEX.md.

Verification is milestone-specific: M1 schema generated, scratch migration applied, TypeScript clean. Payment execution, domain invariants, onboarding and runtime UI remain subsequent milestone gates, not claims established by model presence.
