/**
 * RLS behaviour tests for the `categories` table.
 *
 * These tests document the expected security posture after migration 2026041202:
 *
 *  ┌─────────────────────────────────────────────────────────────────────────┐
 *  │ Role                    │ Direct INSERT  │ Admin-manage  │ RPC           │
 *  │─────────────────────────│────────────────│───────────────│───────────────│
 *  │ anon                    │ blocked        │ blocked       │ blocked       │
 *  │ authenticated (narocnik)│ blocked        │ blocked       │ allowed       │
 *  │ authenticated (admin)   │ allowed (ALL)  │ allowed       │ allowed       │
 *  └─────────────────────────────────────────────────────────────────────────┘
 *
 * Because these tests require live Supabase credentials they are SKIPPED in
 * normal CI (no env vars).  Set SUPABASE_URL + SUPABASE_ANON_KEY +
 * SUPABASE_SERVICE_ROLE_KEY (and optionally TEST_ADMIN_USER_JWT) to run them.
 *
 * Run:  npx jest __tests__/security/categoriesRls.test.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const hasCredentials = Boolean(SUPABASE_URL && ANON_KEY && SERVICE_KEY)

// Helper: returns a unique test category name unlikely to collide with real data
function uniqueName(prefix = 'RLS-test') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ---------------------------------------------------------------------------
// Helpers to build Supabase clients with different privilege levels
// ---------------------------------------------------------------------------

/** Unauthenticated client – anon key only */
function anonClient() {
  return createClient(SUPABASE_URL, ANON_KEY)
}

/** Client authenticated as a regular user via a JWT obtained from service role */
async function authenticatedUserClient(email: string, password: string) {
  const client = createClient(SUPABASE_URL, ANON_KEY)
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Sign-in failed: ${error.message}`)
  return client
}

/** Service-role client – bypasses all RLS (for setup / teardown) */
function serviceClient() {
  return createClient(SUPABASE_URL, SERVICE_KEY)
}

// ---------------------------------------------------------------------------
// 1. Direct INSERT – must be blocked for non-admins
// ---------------------------------------------------------------------------

describe('categories RLS – direct INSERT', () => {
  const svc = hasCredentials ? serviceClient() : null

  afterAll(async () => {
    if (!svc) return
    // Cleanup: remove test rows inserted during setup
    await svc.from('categories').delete().like('name', 'RLS-test-%')
  })

  it.skipIf(!hasCredentials)(
    'anon client cannot INSERT directly',
    async () => {
      const client = anonClient()
      const { error } = await client.from('categories').insert({
        name: uniqueName(),
        slug: uniqueName('slug'),
        is_active: true,
        is_auto_created: true,
        sort_order: 999,
      })
      expect(error).not.toBeNull()
      // Supabase returns 42501 (insufficient_privilege) or a PostgREST 403
      expect(error?.code === '42501' || error?.code === 'PGRST301' || (error?.message ?? '').includes('policy')).toBe(true)
    }
  )

  it.skipIf(!hasCredentials || !process.env.TEST_USER_EMAIL)(
    'regular authenticated user cannot INSERT directly',
    async () => {
      const client = await authenticatedUserClient(
        process.env.TEST_USER_EMAIL!,
        process.env.TEST_USER_PASSWORD!
      )
      const { error } = await client.from('categories').insert({
        name: uniqueName(),
        slug: uniqueName('slug'),
        is_active: true,
        is_auto_created: true,
        sort_order: 999,
      })
      expect(error).not.toBeNull()
    }
  )
})

// ---------------------------------------------------------------------------
// 2. RPC create_or_find_category – must work for authenticated users
// ---------------------------------------------------------------------------

describe('categories RLS – RPC create_or_find_category', () => {
  const svc = hasCredentials ? serviceClient() : null
  const createdNames: string[] = []

  afterAll(async () => {
    if (!svc || !createdNames.length) return
    await svc.from('categories').delete().in('name', createdNames)
  })

  it.skipIf(!hasCredentials || !process.env.TEST_USER_EMAIL)(
    'authenticated user can create a new category via RPC',
    async () => {
      const client = await authenticatedUserClient(
        process.env.TEST_USER_EMAIL!,
        process.env.TEST_USER_PASSWORD!
      )
      const name = uniqueName('RPC-test')
      createdNames.push(name)

      const { data, error } = await client.rpc('create_or_find_category', {
        p_name: name,
        p_user_id: null,
      })
      expect(error).toBeNull()
      // Should return a UUID string
      expect(typeof data).toBe('string')
      expect(data).toMatch(/^[0-9a-f-]{36}$/)
    }
  )

  it.skipIf(!hasCredentials || !process.env.TEST_USER_EMAIL)(
    'calling RPC twice with the same name returns the same UUID',
    async () => {
      const client = await authenticatedUserClient(
        process.env.TEST_USER_EMAIL!,
        process.env.TEST_USER_PASSWORD!
      )
      const name = uniqueName('RPC-idempotent')
      createdNames.push(name)

      const { data: id1 } = await client.rpc('create_or_find_category', {
        p_name: name,
        p_user_id: null,
      })
      const { data: id2 } = await client.rpc('create_or_find_category', {
        p_name: name,
        p_user_id: null,
      })

      expect(id1).toBe(id2)
    }
  )

  it.skipIf(!hasCredentials || !process.env.TEST_USER_EMAIL)(
    'RPC is case-insensitive: "Elektrika" and "elektrika" resolve to same UUID',
    async () => {
      const client = await authenticatedUserClient(
        process.env.TEST_USER_EMAIL!,
        process.env.TEST_USER_PASSWORD!
      )
      const base = uniqueName('RPC-case')
      createdNames.push(base)

      const { data: id1 } = await client.rpc('create_or_find_category', {
        p_name: base,
        p_user_id: null,
      })
      const { data: id2 } = await client.rpc('create_or_find_category', {
        p_name: base.toLowerCase(),
        p_user_id: null,
      })

      expect(id1).toBe(id2)
    }
  )

  it.skipIf(!hasCredentials || !process.env.TEST_USER_EMAIL)(
    'RPC rejects too-short name and returns an error',
    async () => {
      const client = await authenticatedUserClient(
        process.env.TEST_USER_EMAIL!,
        process.env.TEST_USER_PASSWORD!
      )
      const { data, error } = await client.rpc('create_or_find_category', {
        p_name: 'A',
        p_user_id: null,
      })
      expect(error).not.toBeNull()
      expect(data).toBeNull()
    }
  )

  it.skipIf(!hasCredentials || !process.env.TEST_USER_EMAIL)(
    'RPC rejects names with invalid characters',
    async () => {
      const client = await authenticatedUserClient(
        process.env.TEST_USER_EMAIL!,
        process.env.TEST_USER_PASSWORD!
      )
      const { error } = await client.rpc('create_or_find_category', {
        p_name: 'Bad#Chars',
        p_user_id: null,
      })
      expect(error).not.toBeNull()
    }
  )

  it.skipIf(!hasCredentials)(
    'anon client cannot call RPC',
    async () => {
      const client = anonClient()
      const { error } = await client.rpc('create_or_find_category', {
        p_name: uniqueName(),
        p_user_id: null,
      })
      expect(error).not.toBeNull()
    }
  )
})

// ---------------------------------------------------------------------------
// 3. Admin can directly manage categories (SELECT already exists from 004)
// ---------------------------------------------------------------------------

describe('categories RLS – admin management', () => {
  it.skipIf(!hasCredentials)(
    'service-role client can INSERT and DELETE categories',
    async () => {
      const svc = serviceClient()
      const name = uniqueName('admin-test')

      const { data: inserted, error: insertErr } = await svc
        .from('categories')
        .insert({ name, slug: uniqueName('admin-slug'), is_active: true, sort_order: 999 })
        .select('id')
        .single()

      expect(insertErr).toBeNull()
      expect(inserted?.id).toBeDefined()

      const { error: deleteErr } = await svc
        .from('categories')
        .delete()
        .eq('id', inserted!.id)

      expect(deleteErr).toBeNull()
    }
  )
})
