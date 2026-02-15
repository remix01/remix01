# LiftGO SEO Infrastructure — Implementacija

Vsa SEO infrastruktura je implementirana in pripravljena za uporabo. Sledijo TypeScript datoteke po kategorijah.

---

## 1. Osnovna metadata komponenta (app/layout.tsx)

**Lokacija:** `/app/layout.tsx`

**Implementirano:**
- ✅ Default title z template pattern
- ✅ Comprehensive description
- ✅ Open Graph tags (title, description, image, type, siteName, locale)
- ✅ Twitter Card meta tags
- ✅ Canonical URL
- ✅ Enhanced robots directives
- ✅ Favicon configuration
- ✅ Viewport settings za mobile
- ✅ Organization Schema.org JSON-LD

**Ključne funkcionalnosti:**
- Podpora za slovenska znaka (latin-ext)
- Enhanced Google Bot directives
- Strukturirani podatki za iskalnike

---

## 2. Dinamična metadata za kategorijske strani

**Lokacija:** `/app/search/page.tsx` in `/app/search/metadata.ts`

### app/search/metadata.ts

Vsebuje:
- Metadata za vsako kategorijo storitev (Vodovod, Elektrika, Gradnja, itd.)
- Dinamično generiranje title in description z {location} placeholder
- Helper funkcija `getMetadataForCategory()` za pametno mapiranje

**Podprte kategorije:**
1. vodovod-ogrevanje
2. elektrika-pametni-sistemi
3. gradnja-adaptacije
4. mizarstvo-kovinarstvo
5. zakljucna-dela
6. okna-vrata-sencila
7. okolica-zunanja-ureditev
8. vzdrzevanje-popravila

**Format Title:**
```
"[Kategorija] v [Lokacija] | LiftGO — [Dodatek]"
```

**Primer:**
- URL: `/search?storitev=vodovod-ogrevanje&lokacija=Ljubljana`
- Title: `"Vodovodar v Ljubljani | LiftGO — Preverjeni mojstri"`
- Description: `"Najdite verificiranega vodovoda v Ljubljani. Hiter odziv v manj kot 2 urah. Centralno ogrevanje..."`

### app/search/page.tsx

Server Component z:
- `generateMetadata()` funkcijo za dinamične meta tags
- Service Schema.org JSON-LD za vsako kategorijo
- Open Graph in Twitter card metadata
- Canonical URLs z query parameters

---

## 3. Schema.org JSON-LD skripte

**Lokacija:** `/app/components/JsonLd.tsx`, `/app/layout.tsx`, `/app/page.tsx`, `/app/search/page.tsx`

### Implementirani schemas:

#### A) Organization Schema (layout.tsx)
- Globalni schema za LiftGO organizacijo
- Vsebuje: ime, naslov, kontakt, leto ustanovitve

#### B) WebSite Schema (page.tsx)
- Informacije o spletni strani
- SearchAction za Google Search Box

#### C) LocalBusiness + AggregateRating Schema (page.tsx)
- Rating: 4.9/5
- Review count: 1200
- Vključuje primere reviews

#### D) FAQPage Schema (page.tsx)
- 4 najpogostejša vprašanja
- Odgovori v slovenščini

#### E) Service Schema (search/page.tsx)
- Dinamičen schema za vsako kategorijo storitev
- Vključuje areaServed in offerCatalog
- AggregateRating za kategorijo

---

## 4. Sitemap.xml generator

**Lokacija:** `/app/sitemap.ts`

**Vsebuje:**
- Vse statične strani (/, /kako-deluje, /za-obrtnike, itd.)
- Vse kategorijske strani (9 kategorij)
- Lokacijske strani (10 večjih mest)
- Pravilne lastModified timestamps
- Primerne changeFrequency in priority vrednosti

**Priority sistem:**
- 1.0 = Homepage
- 0.9 = Kako deluje, Za obrtnike
- 0.8 = Kategorije, Pricing
- 0.7 = Blog, FAQ, O nas
- 0.6 = Lokacije, Search

**Dostop:**
```
https://www.liftgo.net/sitemap.xml
```

---

## 5. robots.txt

**Lokacija:** `/app/robots.ts`

**Pravila:**
- ✅ Allow: vse javne strani
- ❌ Disallow: /partner-dashboard/*, /partner-auth/*, /api/*, /protected
- 🤖 Block: GPTBot, ChatGPT-User, CCBot, anthropic-ai, Claude-Web
- 📍 Sitemap: https://www.liftgo.net/sitemap.xml

**Dostop:**
```
https://www.liftgo.net/robots.txt
```

---

## Testiranje

### 1. Google Rich Results Test
```
https://search.google.com/test/rich-results?url=https://www.liftgo.net
```

### 2. Facebook Debugger (Open Graph)
```
https://developers.facebook.com/tools/debug/?q=https://www.liftgo.net
```

### 3. Twitter Card Validator
```
https://cards-dev.twitter.com/validator
```

### 4. Sitemap Test
```
https://www.liftgo.net/sitemap.xml
```

### 5. Robots.txt Test
```
https://www.liftgo.net/robots.txt
```

---

## Kako oddati v Google Search Console

1. **Dodaj lastništvo:**
   - Google Search Console → Add Property → www.liftgo.net
   - Verificiraj z DNS TXT record ali HTML tag

2. **Submit Sitemap:**
   - Sitemaps → Add new sitemap
   - URL: `https://www.liftgo.net/sitemap.xml`

3. **Request Indexing:**
   - URL Inspection → Enter URL
   - Request Indexing za ključne strani

---

## Performance Checklist

- [x] Metadata v layout.tsx
- [x] Dinamična metadata za search strani
- [x] 5 različnih JSON-LD schemas
- [x] sitemap.ts z vsemi stranmi
- [x] robots.ts z Allow/Disallow rules
- [x] Open Graph tags (title, description, image)
- [x] Twitter Card tags
- [x] Canonical URLs
- [x] Mobile viewport settings
- [x] Slovenian locale (sl-SI)
- [x] Structured data za reviews in ratings

---

## Naslednji koraki (opcijsko)

1. **Blog RSS Feed:**
   - Dodaj `/app/blog/rss.xml/route.ts`

2. **Breadcrumb Schema:**
   - Dodaj BreadcrumbList schema za kategorijske strani

3. **Video Schema:**
   - Če imate video vsebino, dodajte VideoObject schema

4. **Local SEO:**
   - Dodajte več lokacijskih podstrani z unique content

---

## Kontakt

Za vprašanja glede SEO implementacije:
- Email: info@liftgo.net
- Dokumentacija: https://nextjs.org/docs/app/building-your-application/optimizing/metadata

---

**Status:** ✅ Pripravljen za produkcijo
**Verzija:** 1.0
**Datum:** Februar 2026
