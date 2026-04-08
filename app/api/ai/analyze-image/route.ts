/**
 * Multimodal Image Analysis Endpoint
 *
 * POST /api/ai/analyze-image
 *
 * Analyzes images of home issues using Claude Vision:
 * - Diagnoses problems from photos
 * - Estimates work scope
 * - Suggests relevant service categories
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { env } from '@/lib/env'
import { analyzeImage } from '@/lib/ai/orchestrator'
import { isAgentAccessible, getAgentDailyLimit, AGENT_DAILY_LIMITS } from '@/lib/agents/ai-router'

const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  env.SUPABASE_SERVICE_ROLE_KEY || 'development-service-role-key'
)

interface AnalyzeImageRequest {
  imageUrl: string
  analysisType?: 'diagnosis' | 'estimate' | 'general'
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 2. Check access (video_diagnosis is PRO only)
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single()

    const userTier = profile?.subscription_tier || 'start'

    if (!isAgentAccessible('video_diagnosis', userTier)) {
      return NextResponse.json(
        {
          error: 'Access denied',
          message: 'Analiza slik zahteva naročnino PRO',
          code: 'AGENT_ACCESS_DENIED',
        },
        { status: 403 }
      )
    }

    // 3. Check daily quota
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { count } = await supabaseAdmin
      .from('ai_usage_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('agent_name', 'video_diagnosis')
      .gte('created_at', today.toISOString())

    const dailyLimit = getAgentDailyLimit('video_diagnosis', userTier)
    if ((count || 0) >= dailyLimit) {
      return NextResponse.json(
        {
          error: 'Quota exceeded',
          message: `Dnevna kvota za analizo slik dosežena (${count}/${dailyLimit})`,
          code: 'QUOTA_EXCEEDED',
        },
        { status: 429 }
      )
    }

    // 4. Parse request
    const body: AnalyzeImageRequest = await request.json()

    if (!body.imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 })
    }

    // Validate URL
    try {
      new URL(body.imageUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid imageUrl format' }, { status: 400 })
    }

    // 5. Analyze image
    const startTime = Date.now()
    const result = await analyzeImage(body.imageUrl, body.analysisType || 'diagnosis')
    const durationMs = Date.now() - startTime

    // 6. Log usage (approximate tokens for vision)
    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: user.id,
      agent_name: 'video_diagnosis',
      input_tokens: 1500, // Approximate for image
      output_tokens: 500,
      total_cost_usd: 0.015, // Approximate cost for vision
      model_id: 'claude-sonnet-4-6',
      created_at: new Date().toISOString(),
    })

    // 7. Return response
    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      suggestedCategories: result.suggestedCategories,
      estimatedComplexity: result.estimatedComplexity,
      recommendations: result.recommendations,
      metadata: {
        analysisType: body.analysisType || 'diagnosis',
        durationMs,
      },
    })
  } catch (error) {
    console.error('Image analysis error:', error)

    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

// Upload image via form data
export async function PUT(request: NextRequest) {
  try {
    // 1. Authenticate
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // 2. Parse form data
    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const analysisType = (formData.get('analysisType') as string) || 'diagnosis'

    if (!file) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    // 3. Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      )
    }

    // 4. Upload to Supabase Storage
    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${user.id}/${Date.now()}.${fileExt}`

    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('task-images')
      .upload(fileName, file, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
    }

    // 5. Get public URL
    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('task-images').getPublicUrl(fileName)

    // 6. Analyze the uploaded image
    const result = await analyzeImage(
      publicUrl,
      analysisType as 'diagnosis' | 'estimate' | 'general'
    )

    // 7. Log usage
    await supabaseAdmin.from('ai_usage_logs').insert({
      user_id: user.id,
      agent_name: 'video_diagnosis',
      input_tokens: 1500,
      output_tokens: 500,
      total_cost_usd: 0.015,
      model_id: 'claude-sonnet-4-6',
      created_at: new Date().toISOString(),
    })

    return NextResponse.json({
      success: true,
      imageUrl: publicUrl,
      analysis: result.analysis,
      suggestedCategories: result.suggestedCategories,
      estimatedComplexity: result.estimatedComplexity,
      recommendations: result.recommendations,
    })
  } catch (error) {
    console.error('Image upload/analysis error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
