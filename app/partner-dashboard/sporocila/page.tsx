'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConversationList } from '@/components/messages/ConversationList'
import { ChatPanel } from '@/components/messages/ChatPanel'
import { useRealtimeSporocila } from '@/hooks/useRealtimeSporocila'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PartnerSidebar } from '@/components/partner/sidebar'
import { PartnerBottomNav } from '@/components/partner/bottom-nav'

export default function PartnerSporocila() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [partnerMeta, setPartnerMeta] = useState({
    business_name: 'Moj portal',
    subscription_tier: 'start' as 'start' | 'pro' | 'elite',
    avg_rating: 0,
    is_verified: false,
  })
  const [selectedPovprasevanje, setSelectedPovprasevanje] = useState<string | null>(null)
  const [selectedReceiver, setSelectedReceiver] = useState<string | null>(null)
  const [povprasevanjeInfo, setPovprasevanjeInfo] = useState<any>(null)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/partner-auth/login')
        return
      }
      setCurrentUser(user)

      const { data: partner } = await supabase
        .from('obrtnik_profiles')
        .select('business_name, subscription_tier, avg_rating, is_verified')
        .eq('id', user.id)
        .maybeSingle()

      if (partner) {
        const resolvedTier =
          partner.subscription_tier === 'elite'
            ? 'elite'
            : partner.subscription_tier === 'pro'
              ? 'pro'
              : 'start'
        setPartnerMeta({
          business_name: partner.business_name || 'Moj portal',
          subscription_tier: resolvedTier,
          avg_rating: partner.avg_rating || 0,
          is_verified: !!partner.is_verified,
        })
      }
    }
    checkAuth()
  }, [router, supabase])

  const { sporocila, sendMessage, isLoading } = useRealtimeSporocila(
    selectedPovprasevanje || '',
    currentUser?.id || ''
  )

  const handleSelectConversation = async (povprasevanjeId: string, receiverId: string) => {
    setSelectedPovprasevanje(povprasevanjeId)
    setSelectedReceiver(receiverId)
    setShowMobileChat(true)

    // Fetch povprasevanje info
    const { data } = await supabase
      .from('povprasevanja')
      .select('title')
      .eq('id', povprasevanjeId)
      .maybeSingle()

    if (data) {
      setPovprasevanjeInfo(data)
    }
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen items-center justify-center p-8">
        <p className="text-slate-500">Nalaganje sporočil...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-background">
      <PartnerSidebar partner={partnerMeta} />
      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        <div className="space-y-6 p-4 md:p-6 lg:p-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Sporočila</h1>
            <p className="text-slate-600 mt-1">Komunicirajte s strankami</p>
          </div>

          {/* Mobile: Show chat if selected, list otherwise */}
          <div className="md:hidden">
            {showMobileChat && selectedPovprasevanje && selectedReceiver ? (
              <div className="space-y-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMobileChat(false)}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Nazaj na pogovore
                </Button>
                <ChatPanel
                  messages={sporocila}
                  currentUserId={currentUser.id}
                  otherUserName={selectedReceiver}
                  receiverId={selectedReceiver}
                  onSendMessage={sendMessage}
                  isLoading={isLoading}
                  povprasevanjeTitle={povprasevanjeInfo?.title}
                />
              </div>
            ) : (
              <ConversationList
                currentUserId={currentUser.id}
                selectedConversation={selectedPovprasevanje}
                onSelectConversation={handleSelectConversation}
              />
            )}
          </div>

          {/* Desktop: 2-panel layout */}
          <div className="hidden h-[calc(100vh-240px)] gap-4 md:flex">
            <div className="w-[30%] min-w-[280px]">
              <ConversationList
                currentUserId={currentUser.id}
                selectedConversation={selectedPovprasevanje}
                onSelectConversation={handleSelectConversation}
              />
            </div>

            <div className="w-[70%] flex-1">
              {selectedPovprasevanje && selectedReceiver ? (
                <ChatPanel
                  messages={sporocila}
                  currentUserId={currentUser.id}
                  otherUserName={selectedReceiver}
                  receiverId={selectedReceiver}
                  onSendMessage={sendMessage}
                  isLoading={isLoading}
                  povprasevanjeTitle={povprasevanjeInfo?.title}
                  povprasevanjeId={selectedPovprasevanje}
                />
              ) : (
                <div className="bg-white rounded-lg border flex flex-col items-center justify-center h-full">
                  <MessageCircle className="w-16 h-16 text-slate-300 mb-4" />
                  <p className="text-slate-500 text-lg">Izberite pogovor za prikaz sporočil</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      <PartnerBottomNav paket={{ paket: partnerMeta.subscription_tier }} />
    </div>
  )
}
