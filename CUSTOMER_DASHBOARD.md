# Customer Dashboard Audit & Enhancements

## Faza 1 – kritični popravki
- Popravljen `params` typing v ocenjevanju (`/ocena/[ponudbaId]`) in dodan guard, da je ocena dovoljena šele ob `zakljuceno`.
- V sporočilih dodani guardi za prazne `povprasevanjeId/currentUserId`, da ne prihaja do praznih realtime subscribov.
- V oddaji povpraševanja dodan jasen error feedback pri delno neuspešnem uploadu.
- V ponudbah onemogočeno ponovno sprejemanje, če je ponudba že sprejeta.

## Faza 2 – AI nadgradnje
- AI čarovnik povpraševanja (`AIConversationalForm`).
- AI analiza ponudb (`AIOfferAnalysisCard`, `/api/ai/analyze-offers`).
- AI projektni pomočnik na vseh naročniških zaslonih.
- Transparency tracker na podrobnostih povpraševanja.
- Nova sekcija `/moj-dom` za dolgoročno vzdrževanje doma z AI nasveti.

## Predlog verifikacije
1. Ustvari povpraševanje z AI čarovnikom, potrdi prefill in oddajo.
2. V podrobnostih povpraševanja preveri kartico **AI Analiza ponudb**.
3. Na katerikoli naročniški strani odpri AI pomočnika in preveri odgovor.
4. Na `/moj-dom` dodaj dogodek in preveri AI priporočila.
