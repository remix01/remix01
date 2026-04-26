import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PartnerBottomNav } from '@/components/partner/bottom-nav'
import { PartnerSidebar } from '@/components/partner/sidebar'
import { ListSyncToolbar } from '@/components/partner/list-sync-toolbar'

export default async function PartnerNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/partner-auth/login')

  const { data: partner } = await supabase
    .from('obrtnik_profiles')
    .select('id, subscription_tier, business_name, avg_rating, is_verified')
    .eq('id', user.id)
    .maybeSingle()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const typeLabels: Record<string, { label: string; icon: string; color: string }> = {
    nova_ponudba: { label: 'Nova ponudba', icon: '📋', color: 'blue' },
    ponudba_sprejeta: { label: 'Ponudba sprejeta', icon: '✅', color: 'green' },
    ponudba_zavrnjena: { label: 'Ponudba zavrnjena', icon: '❌', color: 'red' },
    placilo_prejeto: { label: 'Plačilo prejeto', icon: '💰', color: 'green' },
    nova_ocena: { label: 'Nova ocena', icon: '⭐', color: 'yellow' },
    spor_odprt: { label: 'Spor odprt', icon: '⚠️', color: 'orange' },
  }

  return (
    <div className="flex h-screen bg-background">
      <PartnerSidebar
        partner={{
          business_name: partner?.business_name || 'Moj portal',
          subscription_tier: partner?.subscription_tier === 'elite' ? 'elite' : partner?.subscription_tier === 'pro' ? 'pro' : 'start',
          avg_rating: partner?.avg_rating || 0,
          is_verified: !!partner?.is_verified,
        }}
      />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0 w-full">
        <div className="max-w-2xl mx-auto p-4 md:p-6">
          <h1 className="text-2xl font-bold mb-6">Obvestila</h1>
          <ListSyncToolbar />
          
          {(!notifications || notifications.length === 0) ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-4xl mb-4">🔔</p>
              <p>Ni novih obvestil</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map(n => {
                const type = typeLabels[n.type] || { label: n.type, icon: '📬', color: 'gray' }
                return (
                  <div key={n.id} className={`bg-white rounded-xl border p-4 flex gap-3 ${!n.is_read ? 'border-teal-200 bg-teal-50' : ''}`}>
                    <span className="text-2xl">{type.icon}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{n.message || n.body}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(n.created_at).toLocaleString('sl-SI')}
                      </p>
                    </div>
                    {!n.is_read && <div className="w-2 h-2 rounded-full bg-teal-500 mt-1 flex-shrink-0" />}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
      <PartnerBottomNav paket={{ paket: (partner?.subscription_tier as string) === 'elite' ? 'elite' : partner?.subscription_tier === 'pro' ? 'pro' : 'start' }} />
    </div>
  )
}
