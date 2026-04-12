# Preverba analize: ustvarjanje lastnih kategorij (`/novo-povprasevanje`)

Datum preverbe: 2026-04-12

## Povzetek preverbe

Analiza je **delno pravilna**, vendar trenutno stanje kode kaže nekaj pomembnih odstopanj:

1. **Frontend funkcionalnost za vnos lastne kategorije obstaja in je aktivna.**
2. **Backend vsebuje centralizirano logiko `getOrCreateCategory()` z validacijo, slug logiko in fallbackom za race condition.**
3. **RLS za `categories` je po migracijah videti problematičen za navadne uporabnike (ni vidne INSERT politike), zato je trditev o kritičnem RLS tveganju utemeljena.**
4. **API endpoint trenutno ob napaki pri kreiranju kategorije nadaljuje brez kategorije (`category_id = null`), kar je funkcionalna luknja.**

## Kaj je potrjeno v kodi

### 1) Frontend: custom kategorija je implementirana
- Na strani `app/(narocnik)/novo-povprasevanje/page.tsx` obstaja UI blok z besedilom *"Vnesite lastno kategorijo in jo bomo avtomatično ustvarili"*.
- Ob vnosu custom kategorije se `selectedCategory` resetira na `null`.
- Submit pošlje `categoryName` v API payload, če je podan.

### 2) Backend: centralna DAL logika za ustvarjanje/iskanje kategorije obstaja
- Funkcija `getOrCreateCategory(name, userId?, ipAddress?)`:
  - validira dolžino (2-100)
  - validira dovoljene znake
  - izvaja rate limiting
  - išče obstoječo kategorijo case-insensitive
  - generira unikaten slug
  - ob insert napaki retry-a iskanje (fallback pri race condition)

### 3) API flow uporablja auto-create, ampak napako "pogoltne"
- `app/api/povprasevanje/route.ts` kliče `getOrCreateCategory(...)`.
- Če klic pade, samo logira napako in nadaljuje (`continue without category`).
- Zato se lahko povpraševanje ustvari brez kategorije, tudi če je uporabnik vpisal custom kategorijo.

### 4) RLS za `categories`
- Osnovna migracija je imela:
  - `SELECT` za aktivne kategorije
  - `FOR ALL` za admin uporabnike
- Kasnejša "merge" migracija odstrani stare politike in pusti kombiniran `SELECT` policy.
- V migracijah ni jasno vidne nove `INSERT` politike za običajne authenticated uporabnike na `categories`.

## Ocena prvotne analize

### Pravilno / potrjeno
- Opozorila glede RLS in pravic za `INSERT` na `categories`.
- Opozorila glede race condition (čeprav DAL že ima fallback).
- Priporočilo za centralizacijo logike (v praksi že delno narejeno prek DAL).

### Delno pravilno
- Trditev "trenutno stanje: verjetno ne deluje pravilno":
  - UX in tehnični tok obstajata,
  - vendar je tok lahko nekonsistenten zaradi RLS + silent fallback v API.

### Ni potrjeno iz kode repozitorija
- Točno število kategorij (npr. "22")
- Trenutno runtime stanje produkcijske baze
- Dejanske vrednosti tabel/podatkov v živo

## Priporočilo (kratko)

1. V `POST /api/povprasevanje` vrni 400, če je `categoryName` podan in `getOrCreateCategory` ne uspe.
2. Določi eksplicitno politiko za category creation (npr. samo prek SECURITY DEFINER funkcije ali server-only service role poti).
3. Dodaj metrike/log za failed category creation, da ne ostaja "tiha" degradacija.
