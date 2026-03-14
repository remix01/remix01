import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/portfolio/upload
 * Handles portfolio image uploads to Supabase Storage
 * 
 * Auth: Required (authenticated user must be an obrtnik)
 * Body: FormData with 'files' array and 'obrtnikId' string
 * 
 * Response: { urls: string[] } - array of public image URLs
 * Errors: 
 *   - 401 Unauthorized
 *   - 400 Bad Request (validation errors)
 *   - 500 Server error during upload
 */
export async function POST(request: Request) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // 2. Parse formData
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const obrtnikId = formData.get('obrtnikId') as string

    if (!obrtnikId) {
      return NextResponse.json(
        { error: 'Missing obrtnikId' },
        { status: 400 }
      )
    }

    // 3. Validation
    if (!files || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    if (files.length > 8) {
      return NextResponse.json(
        { error: 'Največ 8 slik' },
        { status: 400 }
      )
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json(
          { error: `Datoteka ${file.name} je prevelika (max 5MB)` },
          { status: 400 }
        )
      }

      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          { error: `${file.name} ni slika` },
          { status: 400 }
        )
      }
    }

    // 4. Upload each file to Supabase Storage
    const urls: string[] = []

    for (const file of files) {
      try {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`
        const filePath = `${obrtnikId}/portfolio/${fileName}`

        // Upload file
        const { error: uploadError } = await supabase.storage
          .from('portfolio')
          .upload(filePath, file, {
            contentType: file.type,
            upsert: false,
          })

        if (uploadError) {
          console.error('[v0] Upload error:', uploadError)
          return NextResponse.json(
            { error: `Napaka pri nalaganju: ${uploadError.message}` },
            { status: 500 }
          )
        }

        // Get public URL
        const { data: publicData } = supabase.storage
          .from('portfolio')
          .getPublicUrl(filePath)

        urls.push(publicData.publicUrl)
      } catch (err: any) {
        console.error('[v0] File upload error:', err)
        return NextResponse.json(
          { error: `Napaka pri nalaganju: ${err.message}` },
          { status: 500 }
        )
      }
    }

    // 5. Return URLs
    return NextResponse.json({ urls })
  } catch (error: any) {
    console.error('[v0] Portfolio upload error:', error)
    return NextResponse.json(
      { error: 'Napaka pri nalaganju' },
      { status: 500 }
    )
  }
}
