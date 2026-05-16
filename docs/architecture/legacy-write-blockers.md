# Legacy write blockers (Phase 1 inventory)

Direct route-handler writes to deprecated legacy tables that must be migrated to canonical DAL/service layer:

- `app/api/rezervacija/route.ts` → `rezervacije` (`insert`)  
- `app/api/referrals/submit/route.ts` → `craftworker_profile` (`update`)  
- `app/api/cron/check-tier-upgrades/route.ts` → `craftworker_profile` (`update`)  
- `app/api/auth/accept-terms/route.ts` → `user` (`update`)  
- `app/api/webhooks/twilio/pre-event/route.ts` → `message` (`insert`), `violation` (`insert`), `craftworker_profile` (`update`)  
- `app/api/webhooks/twilio/post-event/route.ts` → `conversation` (`update`), `message` (`update`)  
- `app/api/payments/confirm-completion/route.ts` → `job` (`update`), `payment` (`update`), `craftworker_profile` (`update`)  
- `app/api/payments/dispute/route.ts` → `job` (`update`), `payment` (`update`)  
- `app/api/admin/craftworkers/[id]/suspend/route.ts` → `craftworker_profile` (`update`), `conversation` (`update`)  
- `app/api/admin/craftworkers/[id]/unsuspend/route.ts` → `craftworker_profile` (`update`)  
- `app/api/admin/disputes/[jobId]/resolve/route.ts` → `payment` (`update`), `job` (`update`)

## Next migration step
1. Introduce canonical DAL methods per bounded context (booking, referral, messaging, payments, moderation).
2. Replace route-level direct writes with DAL calls.
3. Keep read compatibility through views/adapters until full cutover.
4. Remove legacy write paths once parity tests pass.
