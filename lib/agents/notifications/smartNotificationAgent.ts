import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { sendEmail } from '@/lib/email/sender'
import {
  newRequestMatchedEmail,
  responseDeadline90minEmail,
  responseDeadlineBreachEmail,
  guaranteeActivatedEmail,
  offerAcceptedEmail,
  newReviewReceivedEmail,
  subscriptionExpiringEmail,
} from '@/lib/email/notification-templates'

export type NotificationType =
  | 'NEW_REQUEST_MATCHED'
  | 'RESPONSE_DEADLINE_90MIN'
  | 'RESPONSE_DEADLINE_BREACH'
  | 'OFFER_ACCEPTED'
  | 'NEW_REVIEW_RECEIVED'
  | 'SUBSCRIPTION_EXPIRING_7D'

const SLOVENIA_TZ = 'Europe/Ljubljana'

/**
 * Check if time falls within quiet hours (22:00–07:00 Ljubljana time)
 */
function isInQuietHours(): boolean {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: SLOVENIA_TZ,
    hour: '2-digit',
    hour12: false,
  })
  const hour = parseInt(formatter.format(new Date()))
  return hour >= 22 || hour < 7
}

/**
 * Get count of notifications sent to partner in last hour
 */
async function getNotificationCountLastHour(partnerId: string): Promise<number> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()

  const { count, error } = await supabaseAdmin
    .from('notification_logs')
    .select('id', { count: 'exact', head: true })
    .eq('recipient_id', partnerId)
    .gt('sent_at', oneHourAgo)

  if (error) {
    console.error('[smartNotificationAgent] Error counting notifications:', error)
    return 0
  }

  return count || 0
}

/**
 * Log notification to audit trail
 */
async function logNotification(
  type: NotificationType,
  recipientId: string,
  channel: 'email' | 'in_app',
  requestId?: string,
  status: 'sent' | 'failed' | 'skipped' = 'sent'
): Promise<void> {
  try {
    await supabaseAdmin.from('notification_logs').insert({
      type,
      recipient_id: recipientId,
      channel,
      request_id: requestId,
      sent_at: new Date().toISOString(),
      status,
    })
  } catch (error) {
    console.error('[smartNotificationAgent] Error logging notification:', error)
  }
}

/**
 * Create in-app notification in notifications table
 */
async function createInAppNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await supabaseAdmin.from('notifications').insert({
      user_id: userId,
      type,
      title,
      body: message,
      link,
      metadata: metadata || {},
    })
  } catch (error) {
    console.error('[smartNotificationAgent] Error creating in-app notification:', error)
  }
}

/**
 * Send notification to partner when new request is matched
 */
export async function sendNewRequestMatchedNotification(
  partnerId: string,
  partnerEmail: string,
  requestId: string,
  requestTitle: string
): Promise<void> {
  // Respect quiet hours for non-urgent notifications
  if (isInQuietHours()) {
    await logNotification(
      'NEW_REQUEST_MATCHED',
      partnerId,
      'email',
      requestId,
      'skipped'
    )
    return
  }

  // Check rate limit
  const count = await getNotificationCountLastHour(partnerId)
  if (count >= 3) {
    console.log(
      `[smartNotificationAgent] Rate limit reached for partner ${partnerId}`
    )
    await logNotification(
      'NEW_REQUEST_MATCHED',
      partnerId,
      'email',
      requestId,
      'skipped'
    )
    return
  }

  try {
    const template = newRequestMatchedEmail(requestTitle, requestId)
    await sendEmail(partnerEmail, template)

    await logNotification('NEW_REQUEST_MATCHED', partnerId, 'email', requestId)
    await createInAppNotification(
      partnerId,
      'NEW_REQUEST_MATCHED',
      'Novo naročilo se ujema z vašo specializacijo',
      `Novo naročilo: ${requestTitle}`,
      `/partner/povprasevanja/${requestId}`
    )

    console.log(
      `[smartNotificationAgent] NEW_REQUEST_MATCHED sent to ${partnerEmail}`
    )
  } catch (error) {
    console.error(
      '[smartNotificationAgent] Error sending NEW_REQUEST_MATCHED:',
      error
    )
    await logNotification(
      'NEW_REQUEST_MATCHED',
      partnerId,
      'email',
      requestId,
      'failed'
    )
  }
}

/**
 * Send urgent notification at T+90min
 */
export async function sendResponseDeadline90minNotification(
  partnerId: string,
  partnerEmail: string,
  requestId: string,
  requestTitle: string
): Promise<void> {
  // 2H guarantee is exception — send anyway
  try {
    const template = responseDeadline90minEmail(requestTitle, requestId)
    await sendEmail(partnerEmail, template)

    await logNotification(
      'RESPONSE_DEADLINE_90MIN',
      partnerId,
      'email',
      requestId
    )
    await createInAppNotification(
      partnerId,
      'RESPONSE_DEADLINE_90MIN',
      '🚨 Naročilo čaka na vaš odziv — 30 minut ostalo',
      `Urgentno: Odgovori na naročilo "${requestTitle}"`,
      `/partner/povprasevanja/${requestId}`
    )

    console.log(
      `[smartNotificationAgent] RESPONSE_DEADLINE_90MIN sent to ${partnerEmail}`
    )
  } catch (error) {
    console.error(
      '[smartNotificationAgent] Error sending RESPONSE_DEADLINE_90MIN:',
      error
    )
    await logNotification(
      'RESPONSE_DEADLINE_90MIN',
      partnerId,
      'email',
      requestId,
      'failed'
    )
  }
}

/**
 * Send notification at T+110min to customer
 */
export async function sendSearchingAlternativeNotification(
  customerId: string,
  customerEmail: string,
  requestId: string,
  requestTitle: string
): Promise<void> {
  try {
    const template = responseDeadlineBreachEmail(requestTitle, 'searching')
    await sendEmail(customerEmail, template)

    await logNotification('RESPONSE_DEADLINE_BREACH', customerId, 'email', requestId)
    await createInAppNotification(
      customerId,
      'RESPONSE_DEADLINE_BREACH',
      'Iščemo alternativo za vaše naročilo',
      `Naročilo "${requestTitle}" — iščemo alternativne ponudnike`,
      `/customer/povprasevanja/${requestId}`
    )

    console.log(
      `[smartNotificationAgent] Searching alternative notification sent to ${customerEmail}`
    )
  } catch (error) {
    console.error(
      '[smartNotificationAgent] Error sending searching alternative notification:',
      error
    )
  }
}

/**
 * Activate 2H guarantee — trigger refund and send notifications
 */
export async function activate2HGuarantee(
  requestId: string,
  customerId: string,
  customerEmail: string,
  requestTitle: string
): Promise<void> {
  try {
    // Create refund trigger
    await supabaseAdmin.from('refund_triggers').insert({
      request_id: requestId,
      triggered_at: new Date().toISOString(),
      reason: '2_hour_guarantee_breach',
      status: 'pending',
    })

    // Send customer guarantee activated email
    const template = guaranteeActivatedEmail(requestTitle)
    await sendEmail(customerEmail, template)

    await logNotification(
      'RESPONSE_DEADLINE_BREACH',
      customerId,
      'email',
      requestId
    )
    await createInAppNotification(
      customerId,
      'RESPONSE_DEADLINE_BREACH',
      'LiftGO 2-urna garancija aktivirana',
      `Naročilo "${requestTitle}" — garancija aktivirana, povračilo se procesira`,
      `/customer/povprasevanja/${requestId}`
    )

    // Send admin alert
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@liftgo.net'
    const adminTemplate = {
      subject: '[LiftGO] 2H Garancija aktivirana - povračilo potrebno',
      html: `
        <h2>Garancija aktivirana</h2>
        <p><strong>Naročilo:</strong> ${requestTitle}</p>
        <p><strong>ID:</strong> ${requestId}</p>
        <p><strong>Razlog:</strong> Ni bilo odziva v 2 urah</p>
        <p><strong>Akcija:</strong> Povračilo je bilo sproženo in je v čakanju na obdelavo</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/admin/povprasevanja/${requestId}">Preglej naročilo</a>
      `,
    }
    await sendEmail(adminEmail, adminTemplate)

    console.log(`[smartNotificationAgent] 2H GUARANTEE activated for request ${requestId}`)
  } catch (error) {
    console.error('[smartNotificationAgent] Error activating 2H guarantee:', error)
  }
}

/**
 * Send notification when offer is accepted
 */
export async function sendOfferAcceptedNotification(
  partnerId: string,
  partnerEmail: string,
  requestId: string,
  requestTitle: string
): Promise<void> {
  try {
    const template = offerAcceptedEmail(requestTitle)
    await sendEmail(partnerEmail, template)

    await logNotification('OFFER_ACCEPTED', partnerId, 'email', requestId)
    await createInAppNotification(
      partnerId,
      'OFFER_ACCEPTED',
      'Ponudba sprejeta!',
      `Vaša ponudba za naročilo "${requestTitle}" je bila sprejeta`,
      `/partner/povprasevanja/${requestId}`
    )

    console.log(
      `[smartNotificationAgent] OFFER_ACCEPTED sent to ${partnerEmail}`
    )
  } catch (error) {
    console.error('[smartNotificationAgent] Error sending OFFER_ACCEPTED:', error)
  }
}

/**
 * Send notification when new review is received
 */
export async function sendNewReviewNotification(
  partnerId: string,
  partnerEmail: string,
  rating: number,
  review: string
): Promise<void> {
  try {
    const template = newReviewReceivedEmail(rating, review)
    await sendEmail(partnerEmail, template)

    await logNotification('NEW_REVIEW_RECEIVED', partnerId, 'email')
    await createInAppNotification(
      partnerId,
      'NEW_REVIEW_RECEIVED',
      `Nova ocena: ${rating} ⭐`,
      review || 'Prejeli ste novo oceno',
      '/partner/reviews'
    )

    console.log(
      `[smartNotificationAgent] NEW_REVIEW_RECEIVED sent to ${partnerEmail}`
    )
  } catch (error) {
    console.error('[smartNotificationAgent] Error sending NEW_REVIEW_RECEIVED:', error)
  }
}

/**
 * Send subscription expiring notification (7 days before)
 */
export async function sendSubscriptionExpiringNotification(
  partnerId: string,
  partnerEmail: string,
  subscriptionTier: 'START' | 'PRO',
  expiryDate: string
): Promise<void> {
  try {
    const template = subscriptionExpiringEmail(subscriptionTier, expiryDate)
    await sendEmail(partnerEmail, template)

    await logNotification('SUBSCRIPTION_EXPIRING_7D', partnerId, 'email')
    await createInAppNotification(
      partnerId,
      'SUBSCRIPTION_EXPIRING_7D',
      `${subscriptionTier} naročnina izteka čez 7 dni`,
      `Vaša ${subscriptionTier} naročnina bo potekla dne ${expiryDate}`,
      '/partner/subscription'
    )

    console.log(
      `[smartNotificationAgent] SUBSCRIPTION_EXPIRING_7D sent to ${partnerEmail}`
    )
  } catch (error) {
    console.error(
      '[smartNotificationAgent] Error sending SUBSCRIPTION_EXPIRING_7D:',
      error
    )
  }
}
