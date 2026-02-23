import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/dal/profiles'
import { redirect } from 'next/navigation'
import ProfilForm from '@/components/narocnik/profil-form'
import { CalendarConnect } from '@/components/liftgo/CalendarConnect'

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

  // Check if calendar is connected
  const { data: calendarConnection } = await supabase
    .from('calendar_connections')
    .select('id')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="mb-8 text-3xl font-bold text-gray-900">Moj profil</h1>
        
        <ProfilForm 
          profile={profile}
          userEmail={user.email || ''}
        />

        {/* Calendar Connect Section */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Koledar</h2>
          <CalendarConnect
            userId={user.id}
            role="narocnik"
            isConnected={!!calendarConnection}
          />
        </div>
      </div>
    </div>
  )
}
