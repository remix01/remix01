# Codebase issue triage (2026-04-07)

## 1) Task: Fix typo/inconsistent localization strings in search demo data
- **Type:** Typo/content quality
- **Where:** `app/search/search-content.tsx`
- **Issue:** Multiple user-facing strings are written without expected Slovenian diacritics (for example `Zakljucna dela`, `Natancna`, `zakljucna`), which is inconsistent with other localized content and can look like typographical errors.
- **Suggested fix:** Normalize the sample text to proper Slovenian spelling (e.g., `Zaključna dela`, `Natančna`, `zaključna`) and keep category values consistent across `allCraftsmen` and `categoryOptions`.
- **Acceptance criteria:**
  - Strings display with proper spelling/diacritics in the search UI.
  - Category filtering still works for the updated values.

## 2) Task: Fix average processing time calculation bug in queue statistics
- **Type:** Bug
- **Where:** `lib/queue/job-monitoring.ts`
- **Issue:** `averageProcessingTime` is currently hardcoded to `0` in both branches (`processing > 0 ? 0 : 0`), so the metric is always incorrect.
- **Suggested fix:** Calculate average processing time from job metadata (or rename/remove the metric until data is available). At minimum, avoid misleading “computed” values that are constant zero.
- **Acceptance criteria:**
  - `averageProcessingTime` changes based on real queue/job timing data.
  - Add a regression test proving the metric is not always zero when timing data exists.

## 3) Task: Resolve documentation/comment discrepancy for commission logic
- **Type:** Documentation/comment discrepancy
- **Where:** `README.md` and `lib/services/paymentService.ts`
- **Issue:** README documents plan commissions as **START 10% / PRO 5%**, but `releasePayment()` always applies `commissionPercent = 10` while comment implies dynamic plan-based rates are expected.
- **Suggested fix:** Either:
  1. Implement plan-aware commission lookup in `releasePayment()`, or
  2. Update comments/docs to clearly state current behavior (single 10% placeholder) until plan-aware logic ships.
- **Acceptance criteria:**
  - Runtime commission behavior and docs/comments describe the same rule.
  - One source of truth for commission percentages is referenced.

## 4) Task: Improve rate guard unit tests by replacing placeholder assertions
- **Type:** Test improvement
- **Where:** `__tests__/unit/guardrails/rateGuard.test.ts`
- **Issue:** Several test cases use placeholder assertions like `expect(true).toBe(true)`, so they do not validate Redis calls, TTL behavior, or 429 enforcement.
- **Suggested fix:** Replace placeholders with explicit assertions against mocked Redis/anomaly detector interactions and thrown error payloads (`code`, retry-after semantics, and key format).
- **Acceptance criteria:**
  - No placeholder assertions remain in this suite.
  - Tests fail if rate-limit logic regresses (key format, TTL, max-call threshold, and anomaly logging).
