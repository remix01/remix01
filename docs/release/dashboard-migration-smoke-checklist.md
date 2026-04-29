# Dashboard migration smoke checklist

Status: release gate checklist.
Namen: hiter post-deploy smoke za migracijo (brez refactorjev / brez shape sprememb).

---

## A) Admin auth + monetization security

- [ ] Admin user se lahko prijavi in odpre admin dashboard.
- [ ] Non-admin user dobi 401/403 na admin API endpointih.
- [ ] Non-admin user ne more izvesti monetization write operacij (upgrade/reset/flag).
- [ ] Error response je strukturiran (`ok: false` + code/message), legacy error field ostane prisoten kjer je compatibility zahtevana.

## B) Partner dashboard

- [ ] Povpraševanja list dela (`/partner-dashboard/povprasevanja`).
- [ ] Partner offer flow (list/create/update) dela brez shape regressije.
- [ ] CRM endpoint vrača pričakovan payload.
- [ ] Partner payments/commissions view vrne podatke brez auth regressije.

## C) Customer inquiry create (authenticated)

- [ ] Modern payload (`title`, `location_city`, `description`) uspešno kreira inquiry.
- [ ] Legacy payload (`storitev`, `lokacija`, `opis`) uspešno kreira inquiry.
- [ ] Response ostane compatibility-safe (canonical marker + legacy top-level polja).

## D) Public inquiry create

- [ ] Public endpoint sprejme payload in uspešno inserta zapis.
- [ ] Legacy schema fallback (če aktiviran) ne zlomi response shape-a.
- [ ] Osnovne anti-abuse zaščite (honeypot/rate-limit) ne povzročijo 500 regressije.

## E) Agent endpoints

- [ ] `/api/agent/chat` success + error shape stabilna.
- [ ] `/api/agent/scheduling` success + error shape stabilna.
- [ ] `/api/agent/video-diagnosis` deluje.
- [ ] `/api/agent/task-description` deluje.
- [ ] `/api/agent/offer-comparison` deluje.
- [ ] Dinamični `/api/agent/[agentType]` ohrani top-level compatibility fields.

## F) Stripe webhook replay/idempotency

- [ ] Ponovljen Stripe event je prepoznan kot replay in je varno skipan.
- [ ] Nepravilni podpisi vrnejo pričakovano napako (brez crasha).

## G) Route redirect check

- [ ] `/dashboard/stranka` redirecta na `/dashboard`.
- [ ] `/dashboard/stranka/povprasevanja` redirecta na `/povprasevanja`.
- [ ] `/dashboard/stranka/sporocila` redirecta na `/sporocila`.
- [ ] Ni redirect loopa med canonical in legacy customer potmi.

---

## Sign-off

- [ ] Smoke checklist izveden na staging.
- [ ] Ključni contract testi zeleno.
- [ ] Brez blocker regressij za admin/partner/customer/agent flow.
