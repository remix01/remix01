'use server'

import { createClient } from '@/lib/supabase/server'
import { sendNotification } from '@/lib/notifications'

export async function createMessageNotificationAction(
  receiverId: string,
  messagePreview: string,
  povprasevanjeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (user.id === receiverId) return { success: true }

  const { count, error: msgError } = await supabase
    .from('sporocila')
    .select('id', { count: 'exact', head: true })
    .eq('povprasevanje_id', povprasevanjeId)
    .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
    .limit(1)

  if (msgError || !count) {
    return { success: false, error: 'Not a participant in this conversation' }
  }

  return sendNotification({
    userId: receiverId,
    type: 'novo_sporocilo',
    title: 'Novo sporočilo',
    message: messagePreview.substring(0, 100),
    metadata: { povprasevanje_id: povprasevanjeId },
  })
}
