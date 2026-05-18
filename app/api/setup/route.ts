// Removed: was an unauthenticated development-only endpoint.
// All schema management must go through Supabase migrations.
export async function POST() {
  return Response.json({ error: 'Not Found' }, { status: 404 })
}
