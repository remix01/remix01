# Access policy consolidation TODO

Canonical access checks are now centralized in `lib/access-policy.ts` and adopted in a few safe endpoints.

## Remaining duplications to migrate

- [ ] `lib/ai/orchestrator.ts` — unify tier + daily quota checks with `evaluateDailyAiQuota` / feature access helpers.
- [ ] `lib/ai/patterns/agent-router.ts` — same quota + tier checks currently duplicated.
- [ ] `components/agent/AgentSelector.tsx` — frontend tier lock logic should read canonical policy metadata.
- [ ] `components/ai-usage-widget.tsx` — daily limit mapping should use canonical policy limit helpers.
- [ ] `components/partner/nav-config.ts` and sidebar variants — migrate minTier checks to shared policy-driven gate helpers.
- [ ] `app/api/craftsman/earnings/route.ts` and related payment surfaces — optionally expose computed `commissionRate` from canonical policy where needed.
