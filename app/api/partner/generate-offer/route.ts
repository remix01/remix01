import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(req: Request) {
  try {
    // Check authentication
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (!user || authError) {
      return new Response(
        JSON.stringify({ success: false, error: 'Neoverjeni' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get partner info to check plan
    const { data: partner } = await supabase
      .from('partners')
      .select('*')
      .eq('id', user.id)
      .single()

    if (!partner) {
      return new Response(
        JSON.stringify({ success: false, error: 'Partner ni najden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if PRO plan
    const { data: paket } = await supabase
      .from('partner_paketi')
      .select('*')
      .eq('obrtnik_id', partner.id)
      .single()

    if (!paket || paket.paket !== 'pro') {
      return new Response(
        JSON.stringify({ success: false, error: 'PRO paket je obvezen' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()

    // Validate required fields
    if (!body.serviceType || !body.location || !body.description || !body.estimatedHours || !body.hourlyRate) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Manjkajo obvezna polja' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate description length
    if (body.description.length < 50) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Opis mora imeti najmanj 50 znakov' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create Anthropic client
    const client = new Anthropic()

    const prompt = `Ustvari profesionalno ponudbo v slovenščini za naslednje delo:

Vrsta storitve: ${body.serviceType}
Lokacija: ${body.location}
Opis dela: ${body.description}
Ocenjene ure: ${body.estimatedHours}
Urna postavka: €${body.hourlyRate}/ura
Ocena materialov: ${body.materialsEstimate ? `€${body.materialsEstimate}` : 'ni navedena'}
Ime podjetja: ${body.partnerName || 'Partner'}

Ustvari profesionalno strukturirano ponudbo s sledečimi odseki:

1. **GLAVA PODJETJA** - Ime podjetja in osnovni podatki
2. **PREDMET DELA** - Detaljan opis dela in nalog
3. **RAZČLEN CENE** - Jasna razdelitev:
   - Delo (${body.estimatedHours} ur × €${body.hourlyRate}/ura)
   - Materiali (če applicable)
   - Skupna cena
4. **ČASOVNICA** - Ocenjeni časovni razpored
5. **POGOJI PLAČILA** - Plačilo preko depozitnega računa LiftGO
6. **VELJAVNOST** - Ponudba je veljavna 7 dni
7. **KONTAKTNI PODATKI** - Podatki za stik

Nauči se biti profesionalen, jasen in prepričljiv. Ponudba naj bo napisana tako, da navdaja zaupanja.`

    const message = await client.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const offerText = message.content[0].type === 'text' ? message.content[0].text : ''

    if (!offerText) {
      throw new Error('Napaka pri generiranju ponudbe')
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          offerText 
        } 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[v0] Generate offer error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Napaka pri generiranju ponudbe' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
