# LiftGO Canonical Domain Model (Phase 1)

## Canonical tables
Canonical model je ciljna plast, skozi katero morajo iti vsi novi write path-i (prek DAL/service layer):

- `profiles`, `obrtnik_profiles`
- `povprasevanja`, `ponudbe`, `ocene`
- `service_requests`, `tasks`
- `escrow_transactions`, `escrow_disputes`, `escrow_audit_log`
- `notifications`, `audit_logs`, `provider_approval_transitions`

> Opomba: seznam se lahko širi, vendar je pravilo nespremenjeno: novi write-i samo prek canonical DAL/service layer.

## Legacy tables
Legacy tabele (zdaj eksplicitno deprecated):

- `obrtniki`
- `rezervacije`
- `user`
- `craftworker_profile`
- `job`
- `payment`
- `conversation`
- `message`
- `violation`

## Compatibility views
Za prehodno obdobje ostanejo bralni path-i lahko vezani na legacy ali compatibility view sloj, vendar:

- write-i v legacy so blokirani,
- compatibility view-i so namenjeni backward compatibility branju,
- write semantika gre izključno skozi canonical DAL/service.

## Migration phases
1. **Phase 1 (ta sprememba):** označitev legacy tabel + soft/hard guard za write path-e.
2. **Phase 2:** preusmeritev route handler write logike v canonical DAL metode.
3. **Phase 3:** uvedba compatibility view-ov, kjer so še potrebni legacy read odjemalci.
4. **Phase 4:** odstranitev legacy write endpointov in cleanup odvisnosti.
5. **Phase 5:** arhiviranje/decommission legacy tabel po potrjenem cutoverju.

## Write policy
- Vsi novi write path-i (insert/update/delete) morajo iti skozi canonical DAL/service layer.
- Direktni `.from(<legacy>).insert/update/delete` klici v route handlerjih so **BLOCKER**.
- Legacy write guard (`lib/db/legacy-write-guard.ts`) je centralni denylist mehanizem za prvo fazo canonicalization.
