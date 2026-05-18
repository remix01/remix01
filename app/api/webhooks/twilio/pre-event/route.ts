import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { analyzeMessage, getBlockedReasonMessage } from '@/lib/twilio/contentFilter'
import { sendBlockedMessageWarning } from '@/lib/twilio/systemMessages'

/**
 * Twilio Pre-Event Webhook
 * 
 * CRITICAL: Must respond within 5 seconds (Twilio timeout).
 * 
 * This webhook is called BEFORE a message is delivered to the conversation.
 * It analyzes the message content and blocks messages containing contact info
 * or bypass attempts.
 * 
 * Returns: { action: 'BLOCK' } or { action: 'ALLOW' }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now()

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
      Body: messageBody,
      Author: authorIdentity,
      ConversationSid: conversationSid,
      ParticipantSid: participantSid,
    } = params

    if (!messageBody || !conversationSid) {
      console.error('[v0] Missing required parameters')
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
    }

    console.log('[v0] Pre-event webhook received:', {
      conversationSid,
      authorIdentity,
      messageLength: messageBody.length,
    })

    // Analyze message content
    const detection = analyzeMessage(messageBody)

    // Find conversation and related job
    const { data: conversation, error: convoError } = await supabaseAdmin
      .from('conversation')
      .select(`
        *,
        job:job_id(
          *,
          customer:customer_id(*),
          craftworker:craftworker_id(craftworker_profile(*)),
          payment:payment_id(*)
        )
      `)
      .eq('twilio_conversation_sid', conversationSid)
      .single()

    if (convoError || !conversation) {
      console.error('[v0] Conversation not found:', conversationSid)
      // Allow message if conversation not found (fail open)
      return NextResponse.json({ action: 'ALLOW' })
    }

    // Determine sender (customer or craftworker)
    const senderUserId = 
      participantSid === conversation.participant_customer_sid
        ? conversation.job.customer_id
        : conversation.job.craftworker_id

    if (!senderUserId) {
      console.error('[v0] Could not determine sender')
      return NextResponse.json({ action: 'ALLOW' })
    }

    // Check if payment is confirmed (contact info allowed after payment)
    const isPaymentConfirmed = 
      conversation.job.payment?.status === 'HELD' ||
      conversation.job.payment?.status === 'RELEASED'

    // If payment confirmed, allow all messages
    if (isPaymentConfirmed && conversation.contact_revealed_at) {
      // Save message without blocking
      await supabaseAdmin
        .from('message')
        .insert({
          conversation_id: conversation.id,
          sender_user_id: senderUserId,
          body: messageBody,
          is_blocked: false,
          created_at: new Date().toISOString(),
        })

      return NextResponse.json({ action: 'ALLOW' })
    }

    // Block message if violation detected
    if (detection.shouldBlock) {
      console.log('[v0] Blocking message:', {
        violationType: detection.violationType,
        severity: detection.severity,
        detectedItems: detection.detectedItems.length,
      })

      // Save blocked message
      const { data: message, error: msgError } = await supabaseAdmin
        .from('message')
        .insert({
          conversation_id: conversation.id,
          sender_user_id: senderUserId,
          body: detection.redactedBody,
          is_blocked: true,
          blocked_reason: getBlockedReasonMessage(detection.violationType!),
          created_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (!msgError && message) {
        // Create violation record
        await supabaseAdmin
          .from('violation')
          .insert({
            job_id: conversation.job_id,
            user_id: senderUserId,
            message_id: message.id,
            type: detection.violationType!,
            severity: detection.severity,
            detected_content: detection.detectedItems.join(', '),
          })
      }

      // Update craftworker warnings if sender is craftworker
      if (senderUserId === conversation.job.craftworker_id && conversation.job.craftworker?.craftworker_profile) {
        const craftworkerProfile = conversation.job.craftworker.craftworker_profile
        const newWarnings = (craftworkerProfile.bypass_warnings || 0) + 1
        
        await supabaseAdmin
          .from('craftworker_profile')
          .update({
            bypass_warnings: newWarnings,
            // Suspend if 3+ warnings
            is_suspended: newWarnings >= 3,
            suspended_at: newWarnings >= 3 ? new Date().toISOString() : undefined,
            suspended_reason: newWarnings >= 3 
              ? 'Večkratne kršitve pravil proti izogibanju platformi'
              : undefined,
          })
          .eq('id', craftworkerProfile.id)
      }

      // Send warning message to conversation (async, don't wait)
      sendBlockedMessageWarning(conversationSid).catch(error => {
        console.error('[v0] Failed to send warning:', error)
      })

      // Check response time
      const elapsed = Date.now() - startTime
      console.log('[v0] Pre-event response time:', elapsed, 'ms')

      return NextResponse.json({ action: 'BLOCK' })
    }

    // Allow message
    await supabaseAdmin
      .from('message')
      .insert({
        conversation_id: conversation.id,
        sender_user_id: senderUserId,
        body: messageBody,
        is_blocked: false,
        created_at: new Date().toISOString(),
      })

    const elapsed = Date.now() - startTime
    console.log('[v0] Pre-event response time:', elapsed, 'ms')

    return NextResponse.json({ action: 'ALLOW' })
  } catch (error) {
    console.error('[v0] Pre-event webhook error:', error)
    
    // Fail open on error (allow message to prevent blocking legitimate messages)
    return NextResponse.json({ action: 'ALLOW' })
  }
}
