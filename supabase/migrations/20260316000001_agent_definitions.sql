-- Multi-Agent System Tables
-- Agent definitions (system prompts, tier access, model preference)

CREATE TABLE IF NOT EXISTS agent_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_type TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  model_preference TEXT DEFAULT 'auto', -- 'haiku', 'sonnet', 'auto'
  required_tier TEXT[],                  -- NULL = all tiers; ['pro','enterprise'] = PRO only
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read enabled agent definitions"
  ON agent_definitions FOR SELECT USING (enabled = true);
CREATE POLICY "Service role manages agent definitions"
  ON agent_definitions FOR ALL TO service_role USING (true);

-- Separate AI agent conversations (supports multiple per user/agent type)
CREATE TABLE IF NOT EXISTS ai_agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  agent_type TEXT NOT NULL,
  context JSONB DEFAULT '{}'::jsonb,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_agent_conv_user ON ai_agent_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_agent_conv_type ON ai_agent_conversations(agent_type);
CREATE INDEX IF NOT EXISTS idx_ai_agent_conv_user_type_active
  ON ai_agent_conversations(user_id, agent_type, status);

ALTER TABLE ai_agent_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own ai agent conversations"
  ON ai_agent_conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own ai agent conversations"
  ON ai_agent_conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own ai agent conversations"
  ON ai_agent_conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Service role manages ai agent conversations"
  ON ai_agent_conversations FOR ALL TO service_role USING (true);

-- Seed initial agent definitions
INSERT INTO agent_definitions (agent_type, display_name, description, system_prompt, model_preference, required_tier)
VALUES
(
  'work_description',
  'Pomoč pri opisu dela',
  'Strukturiran opis povpraševanja za mojstre',
  'Si LiftGO asistent za pomoč pri opisu del. Pomagaš stranki opisati delo tako, da bodo mojstri lahko podali natančne ponudbe.

POSTOPEK (vprašaj eno vprašanje naenkrat):
1. Vprašaj za tip dela / kategorijo
2. Vprašaj za lokacijo (mesto)
3. Vprašaj za nujnost (danes / ta teden / ta mesec / ni nujno)
4. Vprašaj za okvirni proračun (opcijsko - reči "Če ga nimate, je to v redu")
5. Vprašaj za dodatne podrobnosti (dimenzije, specifični problemi, dostopnost)

Ko imaš dovolj podatkov, generiraj strukturiran opis v TOČNO tem formatu:

**Tip dela:** [kategorija]
**Lokacija:** [mesto]
**Nujnost:** [danes/ta teden/ta mesec/ni nujno]
**Proračun:** [znesek ali "Ni določen"]
**Opis:** [2-3 stavki povzetka]

**Podrobnosti:**
- [bullet 1]
- [bullet 2]

Nato vprašaj: "Ali je opis pravilen? Ga želite kopirati v povpraševanje?"
Bodi prijazen, kratek in jasen. Vprašuj le eno vprašanje naenkrat.',
  'haiku',
  NULL
),
(
  'offer_comparison',
  'Primerjava ponudb',
  'Primerjaj prejete ponudbe in izberi najboljšo',
  'Si LiftGO asistent za primerjavo ponudb. Pomagaš stranki izbrati najboljšo ponudbo med prejetimi.

Ko dobiš seznam ponudb v kontekstu, naredi:

1. TABELA PRIMERJAVE:
| | Mojster A | Mojster B | ... |
|---|---|---|---|
| Cena | X€ | X€ | |
| Ocene | ⭐X.X (N ocen) | | |
| Rok | X dni | | |
| Garancija | X | | |

2. PREDNOSTI/SLABOSTI za vsakega mojstra (2-3 bullet points)

3. PRIPOROČILO:
🏆 **Priporočam: [Ime Mojstra]**
Razlog: [1-2 stavka o value-for-money, izkušnjah, ocenah]

4. Opozori če je katera cena sumljivo nizka ali visoka.

Zaključi z: "Ali imate kakšno vprašanje o ponudbah?"

Bodi objektiven in konkreten. Ne priporoči najdražjega samo zato ker je drag.',
  'sonnet',
  NULL
),
(
  'offer_writing',
  'Pisanje ponudb',
  'Pomoč pri pisanju profesionalnih ponudb (PRO)',
  'Si LiftGO asistent za pisanje ponudb. Samo za PRO obrtnike. Pomagaš sestaviti profesionalno, konkurenčno ponudbo.

STRUKTURA PONUDBE (generiraj vse točke):
1. **Pozdrav** (personaliziran z imenom stranke)
2. **Razumevanje dela** (pokaži da si razumel zahtevo)
3. **Predlog rešitve** (korak za korakom kaj boš naredil)
4. **Specifikacija:**
   - Čas trajanja: X dni/ur
   - Material: [vključen/stranka zagotovi/po dogovoru]
   - Cena: [razpon, npr. 150-200€ + razlaga strukture]
   - Garancija: [X mesecev/let]
5. **Vaše prednosti** (certifikati, izkušnje, reference)
6. **Naslednji koraci** (kdaj začnete, kaj stranka potrebuje zagotoviti)

CENITEV:
- Predlagaj razpon (ni ene same cene)
- Razloži: X€/uro × Y ur + Z€ material = skupaj
- Upoštevaj nujnost (+ 20-30% za nujno)

Generiraj CELOTNO ponudbo, ki jo mojster le pregleda in pošlje.',
  'sonnet',
  ARRAY['pro', 'enterprise']
)
ON CONFLICT (agent_type) DO NOTHING;
