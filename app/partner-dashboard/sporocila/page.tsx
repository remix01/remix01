'use client'

import { useState, useEffect } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConversationList } from '@/components/messages/ConversationList'
import { ChatPanel } from '@/components/messages/ChatPanel'
import { useRealtimeSporocila } from '@/hooks/useRealtimeSporocila'
import { ArrowLeft, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function PartnerSporocila() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedPovprasevanje, setSelectedPovprasevanje] = useState<string | null>(null)
  const [selectedReceiver, setSelectedReceiver] = useState<string | null>(null)
  const [receiverName, setReceiverName] = useState<string | null>(null)
  const [povprasevanjeInfo, setPovprasevanjeInfo] = useState<any>(null)
  const [showMobileChat, setShowMobileChat] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        redirect('/partner-auth/login')
      }
      setCurrentUser(user)
    }
    checkAuth()
  }, [supabase])

  const { sporocila, sendMessage, isLoading } = useRealtimeSporocila(
    selectedPovprasevanje || '',
    currentUser?.id || ''
  )

  const handleSelectConversation = async (povprasevanjeId: string, receiverId: string) => {
    setSelectedPovprasevanje(povprasevanjeId)
    setSelectedReceiver(receiverId)
    setShowMobileChat(true)

    const [povData, profData] = await Promise.all([
      supabase.from('povprasevanja').select('title, naslov').eq('id', povprasevanjeId).maybeSingle(),
      supabase.from('profiles').select('full_name').eq('id', receiverId).single(),
    ])

    if (povData.data) {
      setPovprasevanjeInfo(povData.data)
    }

    const prof = profData.data as { full_name?: string | null } | null
    setReceiverName(prof?.full_name ?? receiverId)
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-slate-500">Nalaganje...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-4 md:p-6 lg:p-8">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Sporočila</h1>
        <p className="text-muted-foreground mt-1">Komunicirajte s strankami</p>
      </div>

      {/* Mobile: Show chat if selected, list otherwise */}
      <div className="flex-1 md:hidden overflow-hidden">
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
              otherUserName={receiverName || selectedReceiver}
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
      <div className="hidden md:flex gap-4 flex-1 min-h-0">
        <div className="w-[30%] min-w-[280px] overflow-y-auto">
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
              otherUserName={receiverName || selectedReceiver}
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
  )
}

