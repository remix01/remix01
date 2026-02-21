'use server'

import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/dal/profiles'
import { redirect } from 'next/navigation'
import ProfilForm from '@/components/narocnik/profil-form'

export default async function ProfilPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/prijava')
  }

  // Fetch profile
  const profile = await getProfile(user.id)
  if (!profile) {
    redirect('/prijava')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Moj profil</h1>
        
        <ProfilForm 
          profile={profile}
          userEmail={user.email || ''}
        />
      </div>
    </div>
  )
}
