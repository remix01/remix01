# Identity Mapping (Canonical + Legacy)

Status: **transitional** (canonical model exists, legacy fallbacks still active in selected paths).

## Pred pisanjem preverjeno

Spodnje je preverjeno v aktualni kodi/migracijah:

- `auth.users.id` je primarni identity source za prijavljenega uporabnika.
- `profiles.id` je canonical FK na `auth.users.id` (core marketplace model).
- `profiles.auth_user_id` se še uporablja v delu aplikacije kot legacy/transition pattern.
- `obrtnik_profiles.id` je canonical partner identity (1:1 na `profiles.id`).
- `obrtnik_profiles.user_id` obstaja kot transitional fallback v delu kode.
- `partners` legacy tabela obstaja in je vključena v migracijski bridge (`new_profile_id`).
- `admin_users.auth_user_id` je canonical admin mapping (z legacy fallback na `admin_users.user_id` v helperju).
- `agent_conversations.user_id` referencira `auth.users(id)`.
- `ai_agent_conversations.user_id` referencira `profiles(id)`.

---

## 1) Canonical partner identity

### Canonical pravilo

**Partner identity = `obrtnik_profiles.id = auth.uid()`**, kjer `obrtnik_profiles.id` referencira `profiles.id`, ta pa `auth.users.id`.

### Kje je to jasno definirano

- Marketplace schema (`profiles.id -> auth.users.id`, `obrtnik_profiles.id -> profiles.id`).
- RLS policy za own insert/update na `obrtnik_profiles` uporablja `auth.uid() = id`.
- Partner resolver v app layer najprej bere `obrtnik_profiles.id = session.user.id`.

### Zakaj

- Enotna identiteta po celotnem stacku (auth → profile → obrtnik profile).
- Manj možnosti za owner-check bug-e pri joinih in endpointih.

---

## 2) Legacy partner fallbacki

Trenutno so prisotni naslednji fallbacki:

1. **Legacy tabela `partners`**
   - Če canonical `obrtnik_profiles` zapis manjka, resolver fallbacka na `partners.user_id`.
   - Emitira se structured warning `PARTNER_ID_MAPPING_FALLBACK`.

2. **Partner migracijski bridge**
   - `partners.new_profile_id` + `migrated_at` v migration setupu.
   - `lib/migration/partner-migration.ts` povezuje legacy partnerja na nov `profiles/obrtnik_profiles` model.

3. **Legacy stolpec `obrtnik_profiles.user_id`**
   - V nekaterih endpointih/tooling-u se še uporablja lookup po `user_id`.

### Interpretacija

To je **namerni dual-read** prehodni model. Canonical je `obrtnik_profiles.id`; legacy fallbacki so samo za kompatibilnost/migracijo.

---

## 3) Canonical customer identity

### Canonical pravilo

**Customer identity = `profiles.id = auth.uid()`**.

### Opombe

- Marketplace migration eksplicitno definira `profiles.id` kot FK na `auth.users(id)`.
- Večina ownership pravil (`povprasevanja.narocnik_id`, `ponudbe` participant checks) je poravnana na ta model.

### Legacy/transition signal

- V app kodi obstajajo lookupi po `profiles.auth_user_id`, kar kaže na zgodovinski model ali delno migriran schema state.

---

## 4) Admin identity

### Canonical pravilo

**Admin identity = `admin_users.auth_user_id = auth.uid()`**.

### Trenutni fallback

- `verifyAdmin()` helper podpira tudi fallback `admin_users.user_id = user.id` za legacy sheme.

### Prakticna posledica

- Novi admin endpointi morajo preverjati admin status po `auth_user_id`.
- `user_id` fallback ostane samo prehodno, dokler ni migration cleanup task.

---

## 5) Agent conversation identity

### Dve tabeli, dva identity layerja

1. `agent_conversations.user_id` → `auth.users(id)`
2. `ai_agent_conversations.user_id` → `profiles(id)`

### Zakaj trenutno deluje

Ker canonical model predvideva `profiles.id = auth.users.id`, je lookup po `user.id` funkcionalen v obeh primerih.

### Tveganje

Če bi se kdaj razvezal `profiles.id != auth.users.id`, bi `ai_agent_conversations` poti začele failati ali vračati napačne rezultate.

---

## 6) Kje se uporablja service role vs app-level ownership

## Service role (`supabaseAdmin`)

Uporablja se za:
- admin preverjanja (`admin_users`),
- migracijske/bridge operacije,
- sistemske workerje in centralne server endpointe,
- poti, kjer je treba obiti RLS in ownership preveriti ročno v app layerju.

**Pravilo:** če endpoint uporablja service role, mora imeti ekspliciten auth + ownership check v kodi.

## App-level ownership (`createClient()` + RLS)

Uporablja se za:
- večino user-initiated read/write tokov,
- poti, kjer RLS policy že definira owner access (`auth.uid()` check).

**Pravilo:** ownership primarno preko RLS, app layer samo dopolni (npr. validacija inputa, status constraints).

---

## 7) Pravila za nove endpoint-e

1. **Identity source**: vedno začni z `auth.uid()`.
2. **Customer mapping**: `profiles.id = auth.uid()`.
3. **Partner mapping**: `obrtnik_profiles.id = auth.uid()` (NE uvajati novih `user_id` variant).
4. **Admin mapping**: `admin_users.auth_user_id = auth.uid()`.
5. **Legacy fallbacke ne širiti**:
   - uporabi jih samo, če endpoint eksplicitno migrira legacy podatke,
   - fallback mora biti označen z warning/TODO.
6. **Service role endpoint**:
   - obvezen auth check,
   - obvezen owner/admin check v app layerju,
   - nikoli ne zaupaj `user_id` iz request body.
7. **Response shape**:
   - ohrani legacy shape,
   - dodaj canonical envelope le non-breaking.

---

## 8) Migracijski TODO seznam

1. **Schema inventory task**: potrdi, ali `profiles.auth_user_id` in `admin_users.user_id` realno še obstajata v produkciji.
2. **Partner cleanup task**:
   - dokončaj `partners -> profiles/obrtnik_profiles` migracijo,
   - izmeri preostale fallback hite (`PARTNER_ID_MAPPING_FALLBACK`).
3. **Code cleanup task**:
   - odstrani read path po `partners.user_id`, ko fallback hit-rate doseže 0,
   - odstrani `obrtnik_profiles.user_id` fallback lookup-e.
4. **Admin cleanup task**:
   - odstrani `admin_users.user_id` fallback iz `verifyAdmin()` po potrditvi sheme.
5. **Agent consistency task**:
   - dokumentiraj in (po potrebi) formaliziraj enoten FK model za agent conversation tabele.
6. **Contract tests**:
   - ohranjaj teste, ki zaklenejo canonical `id` mapping in legacy fallback warninge.

---

## 9) Kaj se NE sme spreminjati brez posebnega taska

1. **`profiles.id` kot FK na `auth.users.id`**.
2. **`obrtnik_profiles.id` kot canonical partner identity**.
3. **`admin_users.auth_user_id` kot canonical admin identity**.
4. **Legacy fallback behavior** (partners/admin legacy) brez migration plana in telemetry.
5. **RLS ownership policy semantics** na `povprasevanja`, `ponudbe`, agent conversation tabelah.
6. **Schema-level identity kolone** (`id`, `auth_user_id`, `user_id`) brez data migration + rollback plana.

---

## Hiter povzetek

- Canonical smer je jasna: **`auth.uid()` → `profiles.id` → domain tabela `id`**.
- Legacy fallbacki so še aktivni in morajo ostati kontrolirani, merjeni in začasni.
- Novi endpointi naj **ne uvajajo novih identity variant**, ampak sledijo canonical mappingu.
