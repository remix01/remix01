import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { prisma } from '@/lib/prisma'

/**
 * Twilio Post-Event Webhook
 * 
 * This webhook is called AFTER a message is delivered to the conversation.
 * It logs message metadata and updates conversation state for analytics.
 * 
 * No blocking logic here - just logging and tracking.
 */
export async function POST(req: NextRequest) {
  try {
    // Validate Twilio signature
    const signature = req.headers.get('x-twilio-signature')
    if (!signature) {
      console.error('[v0] Missing Twilio signature')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = req.url
    const body = await req.formData()
    const params: Record<string, string> = {}
    
    body.forEach((value, key) => {
      params[key] = value.toString()
    })

    // Validate request authenticity
    const isValid = twilio.validateRequest(
      process.env.TWILIO_AUTH_TOKEN!,
      signature,
      url,
      params
    )

    if (!isValid) {
      console.error('[v0] Invalid Twilio signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    // Extract webhook parameters
    const {
      EventType: eventType,
      ConversationSid: conversationSid,
      MessageSid: messageSid,
      Author: authorIdentity,
      Body: messageBody,
      DateCreated: dateCreated,
    } = params

    console.log('[v0] Post-event webhook received:', {
      eventType,
      conversationSid,
      messageSid,
    })

    // Only process MessageAdded events
    if (eventType !== 'onMessageAdded') {
      return NextResponse.json({ success: true })
    }

    if (!conversationSid || !messageSid) {
      console.error('[v0] Missing required parameters')
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    // Find conversation
    const conversation = await prisma.conversation.findUnique({
      where: { twilioConversationSid: conversationSid },
    })

    if (!conversation) {
      console.error('[v0] Conversation not found:', conversationSid)
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
    }

    // Update conversation's last message timestamp
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(dateCreated || Date.now()),
      },
    })

    // Update message with Twilio SID if it exists in our DB
    if (messageBody) {
      await prisma.message.updateMany({
        where: {
          conversationId: conversation.id,
          body: messageBody,
          twilioMessageSid: null,
        },
        data: {
          twilioMessageSid: messageSid,
        },
      })
    }

    console.log('[v0] Post-event processed successfully')

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[v0] Post-event webhook error:', error)
    
    // Return success even on error to prevent Twilio retries
    return NextResponse.json({ success: true })
  }
}
