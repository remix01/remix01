# LiftGO Commission Engine - Gap Analysis & Project Notes

**Date:** April 8, 2026  
**Scope:** Review of proposed "Enterprise Grade" commission design vs. current repository implementation.

## Executive Summary

The proposed design is strong and close to production architecture, but there are several high-risk gaps to close before calling it enterprise-ready in a regulated payments context:

1. **No true multi-step DB atomicity in service layer** for create + audit + balance update in one transaction boundary.
2. **Idempotency strategy is partially flawed** in the provided pseudo-code because it can include a timestamp fallback, which breaks deterministic replay protection.
3. **Webhook implementation draft has a blocking bug** (`supabase` is used but never initialized/imported in the shown route).
4. **Financial integrity controls are incomplete** (no immutable ledger lock, no double-entry model, no explicit FX-rate snapshot table for multi-currency).
5. **Operational controls are not fully specified** (dead-letter strategy, reconciliation job SLOs, alert ownership, backfill procedure).

## What Already Exists in This Repo

Current implementation already includes:

- A commission tracking table (`commission_logs`) with payout lifecycle statuses and retry metadata.
- A service layer for create/transfer/retry/refund logic.
- Event subscriber integration from payment release/refund events.
- Basic idempotency integration at event-subscriber level.

This is a solid baseline but not yet equivalent to the fully featured architecture in your proposal.

## Detailed Gap Review

## 1) Data Model & Ledger Robustness

### Good in proposal
- Dedicated transaction source-of-truth table.
- Separate immutable audit table.
- Balance aggregation table.
- Dispute table.

### Missing / strengthen
- Add **append-only ledger enforcement** (trigger rejecting UPDATE/DELETE of settled financial rows except controlled reversal records).
- Add **double-entry accounting records** (`debit_account`, `credit_account`, amount, currency) for audit-grade reconciliation.
- Add **FX snapshot support** if multi-currency is real requirement:
  - `fx_rate_provider`, `fx_rate_timestamp`, `fx_pair`, `source_amount`, `converted_amount`.
- Add **tax lines** table (VAT basis, jurisdiction, rate, computed tax, rounding mode).

## 2) Idempotency

### Good in proposal
- Unique `idempotency_key` constraint.

### Critical issue to fix
- The sample key generation uses `Date.now()` fallback when Stripe PI is missing. That makes retries generate different keys and can still duplicate.

### Recommended rule
- Build deterministic key from stable business identifiers only, e.g.:
  - `commission:{ponudbaId}:{eventType}`
  - or `commission:{ponudbaId}:{paymentIntentId}` when available.
- Persist idempotency key for all upstream events and outbound transfer attempts.

## 3) Atomicity & Consistency

### Risk
The proposal describes atomic transactions, but the sample TS code executes multiple Supabase calls separately.

### Recommendation
- Move critical writes into a **single Postgres function** that performs:
  1. idempotency check/insert,
  2. commission transaction insert,
  3. audit record insert,
  4. balance refresh enqueue,
  and returns one canonical response.

This gives true DB-level transactional guarantees.

## 4) Webhook Reliability

### Blocking issue in sample
- `supabase` is referenced in Stripe webhook code without initialization.

### Hardening checklist
- Verify signature with strict raw body handling.
- Enforce event-level idempotency by `stripe_event_id` unique constraint.
- Store raw webhook payload + headers for replay/debug (with PII minimization).
- ACK quickly, process async where possible.
- Add dead-letter queue + retry policy + alert thresholds.

## 5) Reporting & Reconciliation

### Missing for enterprise ops
- Daily reconciliation job comparing:
  - DB expected payouts
  - Stripe transfer records
  - bank payout status
- Variance classification (`timing`, `missing_transfer`, `amount_mismatch`, `currency_mismatch`).
- Signed monthly close process with immutable report snapshot.

## 6) Security & Compliance

### Additions suggested
- Explicit separation of duties (admin approval vs payout execution roles).
- Sensitive action reason codes with mandatory comments.
- Audit retention policy: **archive**, do not hard-delete financial audit logs.
- Rate limits + anomaly detection on commission calculation endpoints.

## 7) Performance & Scalability

### Additions suggested
- Partition `commission_transactions` by month/quarter when volume grows.
- Materialized views for dashboard-heavy aggregates.
- Backpressure controls for webhook spikes.

## Priority Implementation Plan

### Phase 1 (must-have, before production)
- Deterministic idempotency keys and unique constraints.
- DB transactional RPC for create+audit flow.
- Webhook bug fix + event idempotency table.
- Reconciliation script for Stripe vs DB.

### Phase 2 (high value)
- Dispute workflow automation and SLA timers.
- Tax/FX snapshot support.
- Enhanced monitoring with on-call runbooks.

### Phase 3 (enterprise maturity)
- Double-entry subledger.
- Period closing workflow and immutable statements.
- Data partitioning + archival strategy.

## Acceptance Criteria (recommended)

- Duplicate webhook replay causes **zero** duplicate commissions.
- Every paid commission has corresponding audit event chain.
- Reconciliation mismatch rate < 0.1% and alerting active.
- End-to-end payout state transition test suite passes in CI.
- Financial records remain reproducible from immutable history.

## Notes for Analysts / Projection

For financial forecasting and analyst workflows, add a dedicated analytical view or mart:

- Dimensions: tier, region, category, acquisition cohort, payment channel.
- Measures: gross volume, commission %, cap-hit ratio, average ticket, payout lag.
- Forecast hooks: rolling 30/90-day trend, churn-adjusted tier migration, scenario simulation.

This enables predictable revenue projections and clearer cap policy tuning.
