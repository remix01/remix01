import { saveCalendarTokens } from '@/lib/mcp/calendar'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')

    if (!code || !state) {
      return NextResponse.json(
        { error: 'Missing code or state parameter' },
        { status: 400 }
      )
    }

    const { userId, role } = JSON.parse(state)

    const { success, error } = await saveCalendarTokens(userId, code)

    if (!success) {
      return NextResponse.json(
        { error: error || 'Failed to save calendar tokens' },
        { status: 500 }
      )
    }

    // Redirect to appropriate profile page
    const profileUrl = role === 'narocnik'
      ? '/narocnik/profil?calendar=connected'
      : '/(obrtnik)/profil?calendar=connected'

    return NextResponse.redirect(
      new URL(profileUrl, process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000')
    )
  } catch (error) {
    console.error('[v0] Calendar callback error:', error)
    return NextResponse.json(
      { error: 'Failed to process calendar callback' },
      { status: 500 }
    )
  }
}
