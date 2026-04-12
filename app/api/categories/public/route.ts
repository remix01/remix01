import { NextResponse } from 'next/server'
import { getActiveCategoriesPublic } from '@/lib/dal/categories'

export const revalidate = 300

export async function GET() {
  try {
    const categories = await getActiveCategoriesPublic()
    return NextResponse.json({ categories })
  } catch (error) {
    console.error('[v0] Failed to load public categories:', error)
    return NextResponse.json({ categories: [] }, { status: 200 })
  }
}
