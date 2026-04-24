'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConversationList } from '@/components/messages/ConversationList'
import { ChatPanel } from '@/components/messages/ChatPanel'
import { useRealtimeSporocila } from '@/hooks/useRealtimeSporocila'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function StankaSporocila() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
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
        router.replace('/prijava')
        return
      }
      setCurrentUser(user)
    }
    checkAuth()
  }, [supabase, router])

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
      .select('title, naslov')
      .eq('id', povprasevanjeId)
      .maybeSingle()

    if (data) {
      setPovprasevanjeInfo(data)
    }
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-slate-500">Nalaganje...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Sporočila</h1>
        <p className="text-slate-600 mt-1">Komunicirajte z mojstri</p>
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
              povprasevanjeTitle={povprasevanjeInfo?.title || povprasevanjeInfo?.naslov}
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
      <div className="hidden md:flex gap-4 h-[calc(100vh-200px)]">
        <div className="w-1/3">
          <ConversationList
            currentUserId={currentUser.id}
            selectedConversation={selectedPovprasevanje}
            onSelectConversation={handleSelectConversation}
          />
        </div>

        <div className="w-2/3">
          {selectedPovprasevanje && selectedReceiver ? (
            <ChatPanel
              messages={sporocila}
              currentUserId={currentUser.id}
              otherUserName={selectedReceiver}
              receiverId={selectedReceiver}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              povprasevanjeTitle={povprasevanjeInfo?.title || povprasevanjeInfo?.naslov}
            />
          ) : (
            <div className="bg-white rounded-lg border flex items-center justify-center h-full">
              <p className="text-slate-500">Izberite pogovor za prikaz sporočil</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
