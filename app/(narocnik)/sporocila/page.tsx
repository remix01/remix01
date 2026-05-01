'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConversationList } from '@/components/messages/ConversationList'
import { ChatPanel } from '@/components/messages/ChatPanel'
import { useRealtimeSporocila } from '@/hooks/useRealtimeSporocila'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NarocnikSporocila() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedPovprasevanje, setSelectedPovprasevanje] = useState<string | null>(null)
  const [selectedReceiver, setSelectedReceiver] = useState<string | null>(null)
  const [receiverName, setReceiverName] = useState<string | null>(null)
  const [povprasevanjeTitle, setPovprasevanjeTitle] = useState<string | null>(null)
  const [showMobileChat, setShowMobileChat] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/prijava')
        return
      }
      setCurrentUser(user)
    }
    checkAuth()
  }, [router])

  const { sporocila, sendMessage, isLoading } = useRealtimeSporocila(
    selectedPovprasevanje || '',
    currentUser?.id || ''
  )

  const handleSelectConversation = async (povprasevanjeId: string, receiverId: string) => {
    setSelectedPovprasevanje(povprasevanjeId)
    setSelectedReceiver(receiverId)
    setReceiverName(null)
    setShowMobileChat(true)

    const supabase = createClient()
    const [povData, profData] = await Promise.all([
      supabase.from('povprasevanja').select('title, naslov').eq('id', povprasevanjeId).single(),
      supabase.from('profiles').select('full_name').eq('id', receiverId).single(),
    ])

    const pov = povData.data as { title?: string | null; naslov?: string | null } | null
    setPovprasevanjeTitle(pov?.title ?? pov?.naslov ?? null)

    const prof = profData.data as { full_name?: string | null } | null
    setReceiverName(prof?.full_name ?? receiverId)
  }

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Nalaganje...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sporočila</h1>
        <p className="text-muted-foreground mt-1">Komunicirajte z mojstri</p>
      </div>

      {/* Mobile: prikaži chat ali seznam */}
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
              otherUserName={receiverName || selectedReceiver}
              receiverId={selectedReceiver}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              povprasevanjeTitle={povprasevanjeTitle ?? undefined}
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
              otherUserName={receiverName || selectedReceiver}
              receiverId={selectedReceiver}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              povprasevanjeTitle={povprasevanjeTitle ?? undefined}
            />
          ) : (
            <div className="bg-card rounded-lg border flex items-center justify-center h-full">
              <p className="text-muted-foreground">Izberite pogovor za prikaz sporočil</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
