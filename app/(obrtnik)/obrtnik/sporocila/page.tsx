'use client'

import { useState, useEffect } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { ConversationList } from '@/components/messages/ConversationList'
import { ChatPanel } from '@/components/messages/ChatPanel'
import { useRealtimeSporocila } from '@/hooks/useRealtimeSporocila'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function ObrtnikSporocila() {
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

    // Fetch povprasevanje and receiver name
    const [povData, profData] = await Promise.all([
      supabase.from('povprasevanja').select('naslov').eq('id', povprasevanjeId).single(),
      supabase.from('profiles').select('full_name').eq('id', receiverId).single(),
    ])

    if (povData.data) {
      setPovprasevanjeInfo(povData.data)
    }
    if (profData.data) {
      setReceiverName(profData.data.full_name)
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
        <p className="text-slate-600 mt-1">Komunicirajte s strankami</p>
      </div>

      {/* Mobile: Show chat if selected, list otherwise */}
      <div className="md:hidden">
        {showMobileChat && selectedPovprasevanje && selectedReceiver && receiverName ? (
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
              otherUserName={receiverName}
              receiverId={selectedReceiver}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              povprasevanjeTitle={povprasevanjeInfo?.naslov}
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
          {selectedPovprasevanje && selectedReceiver && receiverName ? (
            <ChatPanel
              messages={sporocila}
              currentUserId={currentUser.id}
              otherUserName={receiverName}
              receiverId={selectedReceiver}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              povprasevanjeTitle={povprasevanjeInfo?.naslov}
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

                      sendMessage()
                    }
                  }}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={2}
                  placeholder="Napišite sporočilo..."
                />
                <Button
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                  className="px-4"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>Izberite pogovor</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
