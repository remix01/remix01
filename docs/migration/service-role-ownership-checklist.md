# Service-role ownership checklist

Status: release hardening checklist (no behavior change).

Namen: endpointi, ki uporabljajo service-role client (`supabaseAdmin` ali ekvivalent), morajo imeti enoten varnostni minimum, da se preprečijo regresije med migracijo.

---

## Obvezna pravila za vsak service-role endpoint

1. **Auth required**
   - Endpoint mora eksplicitno pridobiti authenticated user (`auth.getUser()` ali ekvivalent).
   - Anonimni request mora biti zavrnjen z 401.

2. **Role resolved from DB**
   - Če endpoint zahteva admin/povišane pravice, se role/membership preveri v bazi (npr. `admin_users`) in ne samo iz request body/query.
   - Legacy role fallback je dovoljen le kot compatibility plast z jasno oznako (TODO + telemetry kjer je smiselno).

3. **Ownership filter**
   - Service-role query mora imeti app-level ownership filter (npr. `where narocnik_id = auth.uid()` ali `partnerId` iz resolverja).
   - Nikoli se ne sme vračati “global” dataset brez role/ownership gate-a.

4. **No trust in query/body user IDs**
   - `user_id`, `obrtnik_id`, `narocnik_id` iz query/body so lahko samo compatibility input.
   - Canonical owner se vedno izračuna iz authenticated identity + DB mappinga.
   - Če compatibility query param obstaja, mismatch mora vrniti 403.

5. **Structured error response**
   - Error payload mora biti strojno berljiv (`ok: false` + strukturiran code/message objekt ali `error_details`).
   - Legacy string error je dovoljen samo kot dodatna compatibility plast.

6. **Test coverage**
   - Contract test mora pokriti najmanj:
     - 401 za anon uporabnika,
     - 403 za non-owner/non-admin,
     - uspešen path z legacy kompatibilnostjo (kjer je relevantno),
     - prisotnost canonical/compatibility response markerjev.

---

## Hitri review template (copy/paste)

- [ ] Endpoint uporablja service role.
- [ ] Auth check obstaja in anon vrne 401.
- [ ] Role/membership je rešen iz DB (če je potrebno).
- [ ] Ownership filter temelji na authenticated identity.
- [ ] Query/body user IDs niso trusted source.
- [ ] Error shape je strukturiran in konsistenten.
- [ ] Contract test pokriva 401/403/success compatibility.

---

## Scope opomba

Ta checklist je namenoma konservativen: ne odstranjuje legacy fallbackov in ne spreminja business logike, ampak zaklene minimalne zaščite za varne release-e med migracijskim obdobjem.
