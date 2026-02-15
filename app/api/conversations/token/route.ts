import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import twilio from 'twilio'

const AccessToken = twilio.jwt.AccessToken
const ChatGrant = AccessToken.ChatGrant

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get jobId from query params
    const jobId = request.nextUrl.searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      )
    }

    // Create access token
    const token = new AccessToken(
      process.env.TWILIO_ACCOUNT_SID!,
      process.env.TWILIO_API_KEY!,
      process.env.TWILIO_API_SECRET!,
      {
        identity: user.id,
        ttl: 3600, // 1 hour
      }
    )

    // Grant access to Conversations
    const chatGrant = new ChatGrant({
      serviceSid: process.env.TWILIO_CONVERSATIONS_SERVICE_SID!,
    })
    token.addGrant(chatGrant)

    return NextResponse.json({
      token: token.toJwt(),
      identity: user.id,
    })
  } catch (error) {
    console.error('[v0] Error generating Twilio token:', error)
    return NextResponse.json(
      { error: 'Failed to generate token' },
      { status: 500 }
    )
  }
}
