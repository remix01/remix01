// Data Access Layer - Messaging
import { createClient } from '@/lib/supabase/server'

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
  read_at?: string
}

export interface Conversation {
  id: string
  obrtnik_id: string
  narocnik_id: string
  povprasevanje_id?: string
  last_message?: string
  last_message_at?: string
  created_at: string
}

/**
 * Get or create conversation between naročnik and obrtnik
 */
export async function getOrCreateConversation(
  obrtnikId: string,
  narocnikId: string,
  povprasevanjeId?: string
): Promise<Conversation | null> {
  const supabase = await createClient()
  
  // Try to find existing conversation
  let query = supabase
    .from('conversations' as any)
    .select('*')
    .eq('obrtnik_id', obrtnikId)
    .eq('narocnik_id', narocnikId)

  if (povprasevanjeId) {
    query = query.eq('povprasevanje_id', povprasevanjeId)
  }

  const { data: existing, error: fetchError } = await query.maybeSingle()

  if (fetchError) {
    console.error('[v0] Error fetching conversation:', fetchError)
    return null
  }

  if (existing) {
    return existing as unknown as Conversation
  }

  // Create new conversation if it doesn't exist
  const { data: created, error: createError } = await supabase
    .from('conversations' as any)
    .insert({
      obrtnik_id: obrtnikId,
      narocnik_id: narocnikId,
      povprasevanje_id: povprasevanjeId,
    })
    .select()
    .maybeSingle()

  if (createError) {
    console.error('[v0] Error creating conversation:', createError)
    return null
  }

  return created as unknown as Conversation
}

/**
 * Get messages for a conversation
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50
): Promise<Message[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('messages' as any)
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[v0] Error fetching messages:', error)
    return []
  }

  return ((data || []) as unknown as Message[]).reverse()
}

/**
 * Send a message
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string
): Promise<Message | null> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('messages' as any)
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
    })
    .select()
    .maybeSingle()

  if (error) {
    console.error('[v0] Error sending message:', error)
    return null
  }

  return data as unknown as Message
}

/**
 * Mark message as read
 */
export async function markMessageAsRead(messageId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('messages' as any)
    .update({ read_at: new Date().toISOString() })
    .eq('id', messageId)

  if (error) {
    console.error('[v0] Error marking message as read:', error)
    return false
  }

  return true
}

/**
 * Get conversations for a user
 */
export async function getUserConversations(userId: string): Promise<Conversation[]> {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('conversations' as any)
    .select('*')
    .or(`obrtnik_id.eq.${userId},narocnik_id.eq.${userId}`)
    .order('last_message_at', { ascending: false })

  if (error) {
    console.error('[v0] Error fetching conversations:', error)
    return []
  }

  return (data || []) as unknown as Conversation[]
}

/**
 * Get unread count for a conversation
 */
export async function getUnreadCount(conversationId: string, userId: string): Promise<number> {
  const supabase = await createClient()
  
  const { count, error } = await supabase
    .from('messages' as any)
    .select('*', { count: 'exact', head: true })
    .eq('conversation_id', conversationId)
    .neq('sender_id', userId)
    .is('read_at', null)

  if (error) {
    console.error('[v0] Error counting unread messages:', error)
    return 0
  }

  return count || 0
}
