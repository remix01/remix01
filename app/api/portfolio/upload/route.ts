import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { withRateLimit } from '@/lib/rate-limit/with-rate-limit'
import { uploadLimiter } from '@/lib/rate-limit/limiters'
import { ok, fail } from '@/lib/http/response'

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
async function postHandler(request: NextRequest) {
  try {
    // 1. Auth check
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return fail('Unauthorized', 401)
    }

    // 2. Parse formData
    const formData = await request.formData()
    const files = formData.getAll('files') as File[]
    const obrtnikId = formData.get('obrtnikId') as string

    if (!obrtnikId) {
      return fail('Missing obrtnikId', 400)
    }

    // 3. Validation
    if (!files || files.length === 0) {
      return fail('No files provided', 400)
    }

    if (files.length > 8) {
      return fail('Največ 8 slik', 400)
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        return fail(`Datoteka ${file.name} je prevelika (max 5MB)`, 400)
      }

      if (!file.type.startsWith('image/')) {
        return fail(`${file.name} ni slika`, 400)
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
          return fail(`Napaka pri nalaganju: ${uploadError.message}`, 500)
        }

        // Get public URL
        const { data: publicData } = supabase.storage
          .from('portfolio')
          .getPublicUrl(filePath)

        urls.push(publicData.publicUrl)
      } catch (err: any) {
        console.error('[v0] File upload error:', err)
        return fail(`Napaka pri nalaganju: ${err.message}`, 500)
      }
    }

    // 5. Return URLs
    return ok({ urls })
  } catch (error: unknown) {
    console.error('[v0] Portfolio upload error:', error)
    return fail('Napaka pri nalaganju', 500)
  }
}

export const POST = withRateLimit(uploadLimiter, postHandler)
