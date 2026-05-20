'use server'

import { createClient } from '@/lib/supabase/server'
import { sendNotification, type NotificationType } from '@/lib/notifications'

export async function createMessageNotificationAction(
  receiverId: string,
  messagePreview: string,
  povprasevanjeId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Unauthorized' }
  if (user.id === receiverId) return { success: true }

  return sendNotification({
    userId: receiverId,
    type: 'novo_sporocilo',
    title: 'Novo sporočilo',
    message: messagePreview.substring(0, 100),
    metadata: { povprasevanje_id: povprasevanjeId },
  })
}
