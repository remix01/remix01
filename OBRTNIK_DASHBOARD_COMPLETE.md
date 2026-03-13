## OBRTNIK DASHBOARD - Komponente izvedene

### Datoteke kreirane:

#### 1. **app/(obrtnik)/obrtnik/ponudbe/page.tsx** (Server + Client hibrid)
- 3 tabe: "Nova povpraševanja" | "Poslane ponudbe" | "Arhiv"
- Tab "Nova povpraševanja":
  - Karte z: kategorija, naslov, opis (preview), lokacija, budget, urgency badge
  - Čas objave: "pred X min/h/d"
  - "Pošlji ponudbo" button → inline PonudbaForm
  - Query: povprasevanja WHERE status='odprto' AND v obrtnikovih kategorijah AND nima že ponudbe
- Tab "Poslane ponudbe":
  - Lista z JOIN povprasevanja
  - Prikaž: naslov, lokacija, ceno, status (sprejeta/poslana)
  - Link na povpraševanje
- Tab "Arhiv":
  - Zavrnjene in preklicane ponudbe

#### 2. **components/obrtnik/offer-form.tsx** ("use client")
- Inline forma za pošiljanje ponudbe
- Polja: price_estimate (€), price_type (dropdown), estimated_duration (text), available_date (date picker), message (textarea)
- Character counter za message (min 30 znakov)
- Validacije: required fields, min 30 chars
- Server Action:
  - INSERT ponudbe
  - INSERT notification za narocnika (type: 'nova_ponudba')
  - Toast "Ponudba poslana!"
  - Zapre formo & reload lista

#### 3. **app/(obrtnik)/obrtnik/sporocila/page.tsx** ("use client")
- 2-panel layout: levo lista konverzacij, desno chat
- Lista konverzacij:
  - Ime stranke
  - Zadnje sporočilo (preview, line-clamp-1)
  - Čas zadnjega sporočila
  - Unread badge
- Chat panel:
  - Bubble messages (lastna sporočila: modra/desna, druga: siva/leva)
  - Textarea input + Send button
  - Auto-scroll na nova sporočila
  - Realtime Subscribe na sporocila tabelo
  - INSERT sporocila on send
  - Keyboard shortcut: Enter = send, Shift+Enter = nova vrsta

#### 4. **app/(obrtnik)/obrtnik/statistike/page.tsx** (Server Component)
- 4 Stats kartice:
  - Poslane ponudbe (skupaj) + ta mesec
  - Sprejete ponudbe + konverzija %
  - Povprečna ocena + número ocen
  - Skupaj zasluženo (SUM price_estimate WHERE status=sprejeta)
- 30-day bar chart:
  - Tailwind divs, brez charting library
  - Ponudbe po dneh, zadnjih 30 dni
  - Responsive bar height (max normaliza)

#### 5. **components/obrtnik/availability-toggle.tsx** ("use client")
- Toggle button: "Na voljo" (zelena) ↔ "Zaseden" (rdeča)
- Zelen/rdeč indikator pika
- PATCH obrtnik_profiles SET is_available=?
- Error handling z AlertCircle icon

#### 6. **app/(obrtnik)/layout.tsx** (Updated)
- Dodana AvailabilityToggle v top bar (zraven NotificationBellClient)
- Flex layout: toggle levo, notification-bell desno

### DB queries pravilno implementirani:
✓ Filtriranje povprasevanja po kategorijah obrtnika
✓ Izključanje povprasevanj s katerimi je že ponudil
✓ Ordering po urgency DESC, created_at DESC
✓ Realtime chat s subscribe
✓ Stats s JOIN in SUM/COUNT

### Slovenski language:
✓ Vsa naslovna in labela besedila v slovenščini
✓ Datumi in časi v slovenski format

### Best practices:
✓ "use client" samo kjer res treba (forme, realtime)
✓ TypeScript strict
✓ Tailwind only (brez inline styles)
✓ NO <form> tags - onClick handlers
✓ Ustreza obstoječim patterns v projektu
