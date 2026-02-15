import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'
import { prisma } from '@/lib/prisma'
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
    const conversation = await prisma.conversation.findUnique({
      where: { twilioConversationSid: conversationSid },
      include: {
        job: {
          include: {
            customer: true,
            craftworker: {
              include: {
                craftworkerProfile: true,
              },
            },
            payment: true,
          },
        },
      },
    })

    if (!conversation) {
      console.error('[v0] Conversation not found:', conversationSid)
      // Allow message if conversation not found (fail open)
      return NextResponse.json({ action: 'ALLOW' })
    }

    // Determine sender (customer or craftworker)
    const senderUserId = 
      participantSid === conversation.participantCustomerSid
        ? conversation.job.customerId
        : conversation.job.craftworkerId

    if (!senderUserId) {
      console.error('[v0] Could not determine sender')
      return NextResponse.json({ action: 'ALLOW' })
    }

    // Check if payment is confirmed (contact info allowed after payment)
    const isPaymentConfirmed = 
      conversation.job.payment?.status === 'HELD' ||
      conversation.job.payment?.status === 'RELEASED'

    // If payment confirmed, allow all messages
    if (isPaymentConfirmed && conversation.contactRevealedAt) {
      // Save message without blocking
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderUserId,
          body: messageBody,
          isBlocked: false,
          sentAt: new Date(),
        },
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
      const message = await prisma.message.create({
        data: {
          conversationId: conversation.id,
          senderUserId,
          body: detection.redactedBody,
          isBlocked: true,
          blockedReason: getBlockedReasonMessage(detection.violationType!),
          sentAt: new Date(),
        },
      })

      // Create violation record
      await prisma.violation.create({
        data: {
          jobId: conversation.jobId,
          userId: senderUserId,
          messageId: message.id,
          type: detection.violationType!,
          severity: detection.severity,
          detectedContent: detection.detectedItems.join(', '),
        },
      })

      // Update craftworker warnings if sender is craftworker
      if (senderUserId === conversation.job.craftworkerId) {
        const craftworkerProfile = conversation.job.craftworker?.craftworkerProfile
        
        if (craftworkerProfile) {
          const newWarnings = craftworkerProfile.bypassWarnings + 1
          
          await prisma.craftworkerProfile.update({
            where: { id: craftworkerProfile.id },
            data: {
              bypassWarnings: newWarnings,
              // Suspend if 3+ warnings
              isSuspended: newWarnings >= 3,
              suspendedAt: newWarnings >= 3 ? new Date() : undefined,
              suspendedReason: newWarnings >= 3 
                ? 'Večkratne kršitve pravil proti izogibanju platformi'
                : undefined,
            },
          })
        }
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
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderUserId,
        body: messageBody,
        isBlocked: false,
        sentAt: new Date(),
      },
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
