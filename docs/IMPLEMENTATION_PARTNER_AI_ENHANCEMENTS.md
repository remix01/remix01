# Partner Dashboard AI Enhancements (Phase 1 + Phase 2)

## Implemented

### Phase 1 (Reliability)
- Canonicalized partner offer flows on `ponudbe` table.
- URL tab deep-link sync on partner dashboard.
- Bottom nav now resolves subscription internally when `paket` prop is omitted.
- CRM conversion uses consistent monthly accepted/sent counters.
- AI offer generator uses `business_name`.
- Inquiry detail page enforces auth/role and open inquiry status.

### Phase 2 (AI)
- `/api/ai/analyze-inquiry`: AI inquiry summary/materials/duration/red flags with Redis cache.
- `/api/ai/generate-replies`: quick reply suggestions in Slovenian.
- `/api/ai/optimize-route`: route ordering endpoint (coords-aware nearest-neighbor fallback).
- `/api/ai/analyze-media`: AI vision analysis for inquiry media.
- `/api/partner/insights` + `/partner-dashboard/insights`: My Business Advisor metrics + recommendations.
- Added `partner_insights` migration table for persisted insight snapshots.

## Verification Plan
1. Open `/partner-dashboard?tab=new-offer` and verify new-offer tab opens.
2. Create/delete offer from dashboard and verify list refreshes.
3. Open `/partner-dashboard/povprasevanja/[id]` and verify AI analysis + quick replies.
4. Open `/partner-dashboard/offers/generate` and test media analysis button.
5. Open `/partner-dashboard/insights` and verify metrics + recommendations load.
