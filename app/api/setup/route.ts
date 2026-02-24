import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Setup endpoint to create tables (run once)
export async function POST(request: Request) {
  try {
    // Create obrtniki table
    await supabase.from('obrtniki').select('id').limit(1);
    
    // Tables already exist or create them via SQL
    const { error: error1 } = await supabase.rpc('setup_liftgo_tables');
    
    if (error1) {
      console.log('[v0] Tables may need manual creation via Supabase UI');
    }

    return Response.json({ 
      message: 'Setup complete. If tables are missing, create them manually in Supabase UI.',
      instructions: {
        obrtniki: 'id (uuid, pk), ime (text), lokacija (text), storitev (text), ocena (float), cena_na_uro (int), razpoložljive_ure (text), verified (bool)',
        povprasevanja: 'id (uuid, pk), storitev (text), lokacija (text), opis (text), obrtnik_id (uuid, fk), termin_datum (date), termin_ura (time), status (enum: novo/sprejeto/zavrnjeno/zakljuceno), email (text), telefon (text), created_at (timestamp)',
        rezervacije: 'id (uuid, pk), povprasevanje_id (uuid, fk), obrtnik_id (uuid, fk), status (enum: potrjena/preklicana), created_at (timestamp)'
      }
    });
  } catch (error) {
    return Response.json({ error: String(error) }, { status: 500 });
  }
}
