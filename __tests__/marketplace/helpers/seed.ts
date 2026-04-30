import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// Stable UUIDs for all seeded test entities
export const TEST_IDS = {
  narocnikUserId:  'aaaaaaaa-0001-0000-0000-000000000000',
  obrtnikUserId:   'bbbbbbbb-0002-0000-0000-000000000000',
  categoryId:      'cccccccc-0003-0000-0000-000000000000',
  povprasevanjeId: 'dddddddd-0004-0000-0000-000000000000',
  ponudbaId:       'eeeeeeee-0005-0000-0000-000000000000',
}

export const TEST_CATEGORY = {
  id: TEST_IDS.categoryId,
  name: 'Vodovodar',
  slug: 'vodovodar-test-seed',
  is_active: true,
  sort_order: 999,
}

export const TEST_POVPRASEVANJE = {
  id: TEST_IDS.povprasevanjeId,
  title: 'Pušča pipa v kopalnici',
  description: 'Vodovodna pipa v kopalnici kaplja že 3 dni.',
  location_city: 'Ljubljana',
  status: 'odprto',
  narocnik_id: null,
  category_id: TEST_IDS.categoryId,
  stranka_email: 'test-narocnik@liftgo-test.invalid',
  stranka_ime: 'Test Naročnik',
}

export const TEST_PONUDBA = {
  id: TEST_IDS.ponudbaId,
  povprasevanje_id: TEST_IDS.povprasevanjeId,
  obrtnik_id: TEST_IDS.obrtnikUserId,
  message: 'Popravimo v roku 24h. Cena vključuje material.',
  price_estimate: 120,
  price_type: 'fiksna',
  status: 'poslana',
}

function getAdmin() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function seedTestData() {
  const admin = getAdmin()

  await admin.from('categories').upsert(TEST_CATEGORY, { onConflict: 'id' })

  await admin.from('profiles').upsert(
    { id: TEST_IDS.narocnikUserId, full_name: 'Test Naročnik', role: 'narocnik' },
    { onConflict: 'id' }
  )
  await admin.from('profiles').upsert(
    { id: TEST_IDS.obrtnikUserId, full_name: 'Test Obrtnik', role: 'obrtnik' },
    { onConflict: 'id' }
  )
  await admin.from('obrtnik_profiles').upsert(
    { id: TEST_IDS.obrtnikUserId, business_name: 'Test Vodovodar d.o.o.', is_verified: true, subscription_tier: 'start' },
    { onConflict: 'id' }
  )
  await admin.from('obrtnik_categories').upsert(
    { obrtnik_id: TEST_IDS.obrtnikUserId, category_id: TEST_IDS.categoryId },
    { onConflict: 'obrtnik_id,category_id' }
  )
}

export async function cleanupTestData() {
  const admin = getAdmin()
  await admin.from('notifications').delete().in('user_id', [TEST_IDS.narocnikUserId, TEST_IDS.obrtnikUserId])
  await admin.from('ponudbe').delete().eq('id', TEST_IDS.ponudbaId)
  await admin.from('povprasevanja').delete().eq('id', TEST_IDS.povprasevanjeId)
  await admin.from('obrtnik_categories').delete().eq('obrtnik_id', TEST_IDS.obrtnikUserId)
  await admin.from('obrtnik_profiles').delete().eq('id', TEST_IDS.obrtnikUserId)
  await admin.from('profiles').delete().in('id', [TEST_IDS.narocnikUserId, TEST_IDS.obrtnikUserId])
  await admin.from('categories').delete().eq('id', TEST_IDS.categoryId)
}

export async function dbGet<T>(table: string, value: string, column = 'id'): Promise<T | null> {
  const admin = getAdmin()
  const { data } = await admin.from(table).select('*').eq(column, value).maybeSingle()
  return data as T | null
}
