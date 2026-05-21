import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { analyzeImage } from '@/lib/ai/orchestrator'
import { validateAIRequest } from '@/lib/ai/ai-security-middleware'
import { safeLogAgentUsage } from '@/lib/agents/usage-logging'

interface AnalyzeImageRequest {
  imageUrl: string
  analysisType?: 'diagnosis' | 'estimate' | 'general'
}

export async function POST(request: NextRequest) {
  try {
    const security = await validateAIRequest(request, { agentType: 'video_diagnosis' })
    if ('error' in security) return security.error
    const { context: secCtx } = security

    const body: AnalyzeImageRequest = await request.json()

    if (!body.imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 })
    }

    try {
      new URL(body.imageUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid imageUrl format' }, { status: 400 })
    }

    const startTime = Date.now()
    const result = await analyzeImage(body.imageUrl, body.analysisType || 'diagnosis')
    const durationMs = Date.now() - startTime

    safeLogAgentUsage({
      userId: secCtx.userId,
      modelUsed: 'claude-sonnet-4-6',
      tokensInput: 1500,
      tokensOutput: 500,
      costUsd: 0.015,
      responseCached: false,
      agentType: 'video_diagnosis',
      responseTimeMs: durationMs,
      endpoint: 'ai/analyze-image',
    })

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

export async function PUT(request: NextRequest) {
  try {
    const security = await validateAIRequest(request, { agentType: 'video_diagnosis' })
    if ('error' in security) return security.error
    const { context: secCtx } = security

    const formData = await request.formData()
    const file = formData.get('image') as File | null
    const analysisType = (formData.get('analysisType') as string) || 'diagnosis'

    if (!file) {
      return NextResponse.json({ error: 'Image file is required' }, { status: 400 })
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Allowed: JPEG, PNG, WebP, GIF' },
        { status: 400 }
      )
    }

    const fileExt = file.name.split('.').pop() || 'jpg'
    const fileName = `${secCtx.userId}/${Date.now()}.${fileExt}`

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

    const {
      data: { publicUrl },
    } = supabaseAdmin.storage.from('task-images').getPublicUrl(fileName)

    const startTime = Date.now()
    const result = await analyzeImage(
      publicUrl,
      analysisType as 'diagnosis' | 'estimate' | 'general'
    )
    const durationMs = Date.now() - startTime

    safeLogAgentUsage({
      userId: secCtx.userId,
      modelUsed: 'claude-sonnet-4-6',
      tokensInput: 1500,
      tokensOutput: 500,
      costUsd: 0.015,
      responseCached: false,
      agentType: 'video_diagnosis',
      responseTimeMs: durationMs,
      endpoint: 'ai/analyze-image',
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
