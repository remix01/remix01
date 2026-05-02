'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDistanceToNow } from 'date-fns'
import { sl } from 'date-fns/locale'
import { MessageCircle, Search } from 'lucide-react'

interface ConversationItem {
  key: string
  povprasevanje_id: string
  user_a_id: string
  user_b_id: string
  user_a_name: string
  user_b_name: string
  last_message: string
  last_message_time: string
  unread_count: number
}

interface Sporocilo {
  id: string
  povprasevanje_id: string
  sender_id: string
  receiver_id: string
  message: string
  is_read: boolean
  created_at: string
}

export default function AdminSporocilaPage() {
  const supabaseRef = useRef(createClient())
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null)
  const [messages, setMessages] = useState<Sporocilo[]>([])
  const [filterUser, setFilterUser] = useState('')
  const [filterPovprasevanjeId, setFilterPovprasevanjeId] = useState('')

  const loadConversations = async () => {
    try {
      const { data, error } = await supabaseRef.current
        .from('sporocila')
        .select(`
          id,
          povprasevanje_id,
          sender_id,
          receiver_id,
          message,
          is_read,
          created_at,
          sender:profiles!sender_id(full_name),
          receiver:profiles!receiver_id(full_name)
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      const map = new Map<string, ConversationItem>()

      data?.forEach((row: any) => {
        const [a, b] = [row.sender_id, row.receiver_id].sort()
        const key = `${row.povprasevanje_id}:${a}:${b}`

        if (!map.has(key)) {
          map.set(key, {
            key,
            povprasevanje_id: row.povprasevanje_id,
            user_a_id: a,
            user_b_id: b,
            user_a_name:
              a === row.sender_id
                ? row.sender?.full_name || row.sender_id
                : row.receiver?.full_name || row.receiver_id,
            user_b_name:
              b === row.sender_id
                ? row.sender?.full_name || row.sender_id
                : row.receiver?.full_name || row.receiver_id,
            last_message: row.message,
            last_message_time: row.created_at,
            unread_count: 0,
          })
        }

        if (row.is_read === false) {
          const entry = map.get(key)
          if (entry) entry.unread_count += 1
        }
      })

      setConversations(
        Array.from(map.values()).sort(
          (x, y) => new Date(y.last_message_time).getTime() - new Date(x.last_message_time).getTime()
        )
      )
    } catch (e) {
      console.error('Admin conversations load failed:', e)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversation: ConversationItem) => {
    const { data, error } = await supabaseRef.current
      .from('sporocila')
      .select('id, povprasevanje_id, sender_id, receiver_id, message, is_read, created_at')
      .eq('povprasevanje_id', conversation.povprasevanje_id)
      .or(
        `and(sender_id.eq.${conversation.user_a_id},receiver_id.eq.${conversation.user_b_id}),and(sender_id.eq.${conversation.user_b_id},receiver_id.eq.${conversation.user_a_id})`
      )
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Admin messages load failed:', error)
      return
    }

    setMessages((data || []) as Sporocilo[])
  }

  useEffect(() => {
    loadConversations()

    const channel = supabaseRef.current
      .channel('admin_sporocila_all')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'sporocila' },
        () => {
          loadConversations()
          if (selectedConversation) loadMessages(selectedConversation)
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sporocila' },
        () => {
          loadConversations()
          if (selectedConversation) loadMessages(selectedConversation)
        }
      )
      .subscribe()

    return () => {
      supabaseRef.current.removeChannel(channel)
    }
  }, [selectedConversation])

  const filteredConversations = useMemo(() => {
    const userFilter = filterUser.trim().toLowerCase()
    const povFilter = filterPovprasevanjeId.trim().toLowerCase()

    return conversations.filter((c) => {
      const userMatch =
        !userFilter ||
        c.user_a_name.toLowerCase().includes(userFilter) ||
        c.user_b_name.toLowerCase().includes(userFilter) ||
        c.user_a_id.toLowerCase().includes(userFilter) ||
        c.user_b_id.toLowerCase().includes(userFilter)

      const povMatch = !povFilter || c.povprasevanje_id.toLowerCase().includes(povFilter)
      return userMatch && povMatch
    })
  }, [conversations, filterUser, filterPovprasevanjeId])

  const openConversation = async (conversation: ConversationItem) => {
    setSelectedConversation(conversation)
    await loadMessages(conversation)
  }

  return (
    <div className="space-y-6 h-full">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Sporočila (Admin vpogled)</h1>
        <p className="text-muted-foreground mt-1">Read-only vpogled v human-to-human pogovore iz sistema sporocila.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <label className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            placeholder="Filter po uporabniku (ime ali ID)"
            className="w-full rounded-md border bg-white px-9 py-2 text-sm"
          />
        </label>

        <input
          value={filterPovprasevanjeId}
          onChange={(e) => setFilterPovprasevanjeId(e.target.value)}
          placeholder="Filter po povprasevanje_id"
          className="w-full rounded-md border bg-white px-3 py-2 text-sm"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3 h-[calc(100vh-260px)]">
        <div className="md:col-span-1 rounded-lg border bg-white overflow-y-auto">
          {loading ? (
            <div className="p-4 text-slate-500">Nalagam pogovore...</div>
          ) : filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              Ni pogovorov za prikaz
            </div>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.key}
                  className={`w-full text-left p-3 hover:bg-slate-50 ${selectedConversation?.key === conv.key ? 'bg-blue-50' : ''}`}
                  onClick={() => openConversation(conv)}
                >
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {conv.user_a_name} ↔ {conv.user_b_name}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{conv.povprasevanje_id}</p>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-1">{conv.last_message}</p>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                    <span>
                      {formatDistanceToNow(new Date(conv.last_message_time), { addSuffix: true, locale: sl })}
                    </span>
                    {conv.unread_count > 0 && <span className="text-red-600 font-medium">Unread: {conv.unread_count}</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2 rounded-lg border bg-white overflow-hidden flex flex-col">
          {!selectedConversation ? (
            <div className="h-full flex items-center justify-center text-slate-500">Izberi pogovor za read-only vpogled.</div>
          ) : (
            <>
              <div className="border-b px-4 py-3 bg-slate-50">
                <p className="font-medium text-slate-900">
                  {selectedConversation.user_a_name} ↔ {selectedConversation.user_b_name}
                </p>
                <p className="text-xs text-slate-500">povprasevanje_id: {selectedConversation.povprasevanje_id}</p>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <p className="text-slate-500 text-sm">Ni sporočil.</p>
                ) : (
                  messages.map((msg) => {
                    const senderName =
                      msg.sender_id === selectedConversation.user_a_id
                        ? selectedConversation.user_a_name
                        : msg.sender_id === selectedConversation.user_b_id
                        ? selectedConversation.user_b_name
                        : msg.sender_id

                    return (
                      <div key={msg.id} className="rounded-lg border p-3 bg-slate-50">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium text-slate-900 truncate">{senderName}</p>
                          <span className={`text-xs ${msg.is_read ? 'text-emerald-600' : 'text-amber-600'}`}>
                            {msg.is_read ? 'Read' : 'Unread'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-slate-800 break-words">{msg.message}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: sl })}
                        </p>
                      </div>
                    )
                  })
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
