import twilio from 'twilio'

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
)

export type SystemMessageType = 'warning' | 'info' | 'success' | 'error'

/**
 * Sends a system message to a Twilio conversation.
 * System messages appear as automated messages from "LiftGO".
 */
export async function sendSystemMessage(
  conversationSid: string,
  text: string,
  type: SystemMessageType = 'info'
): Promise<void> {
  const prefix = getMessagePrefix(type)
  const formattedMessage = `${prefix} ${text}`

  try {
    await twilioClient.conversations.v1
      .conversations(conversationSid)
      .messages
      .create({
        author: 'LiftGO',
        body: formattedMessage,
        attributes: JSON.stringify({
          isSystemMessage: true,
          type,
        }),
      })
  } catch (error) {
    console.error('[v0] Failed to send system message:', error)
    throw error
  }
}

/**
 * Sends a warning message when a message is blocked due to policy violation.
 */
export async function sendBlockedMessageWarning(
  conversationSid: string
): Promise<void> {
  const warningText = 
    'Sporočilo ni dostavljeno. Deljenje kontaktnih podatkov pred potrjenim plačilom ' +
    'krši Pogoje uporabe LiftGO in ohromi vašo zaščito plačila (Člen 4.2).'

  await sendSystemMessage(conversationSid, warningText, 'warning')
}

/**
 * Sends an info message when payment is confirmed and contact info can be shared.
 */
export async function sendContactRevealMessage(
  conversationSid: string
): Promise<void> {
  const infoText = 
    'Plačilo je potrjeno. Kontaktne podatke lahko zdaj delite brez omejitev. ' +
    'Hvala, ker uporabljate LiftGO!'

  await sendSystemMessage(conversationSid, infoText, 'success')
}

/**
 * Returns emoji prefix for system message based on type.
 */
function getMessagePrefix(type: SystemMessageType): string {
  switch (type) {
    case 'warning':
      return '🚫'
    case 'info':
      return 'ℹ️'
    case 'success':
      return '✅'
    case 'error':
      return '⚠️'
    default:
      return 'ℹ️'
  }
}
