/**
 * Test script for automatic category creation feature
 * 
 * Run with: node -e "$(cat scripts/test-category-creation.js)" --env-file=.env.development.local
 */

import { createClient } from '@supabase/supabase-js'
import { slugify } from '@/lib/utils/slugify'

const url = process.env.SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const supabase = createClient(url, key)

async function testCategoryCreation() {
  console.log('[Test] Starting category creation tests...\n')

  // Test 1: Slugify utility
  console.log('Test 1: Slugify utility')
  const testCases = [
    { input: 'Elektrika - Popravila', expected: 'elektrika-popravila' },
    { input: 'Čiščenje', expected: 'ciscenje' },
    { input: 'Gradbeništvo & Gradbene Storitve', expected: 'gradbenistvo-gradbene-storitve' },
    { input: '  Oblaganje streh  ', expected: 'oblaganje-streh' },
  ]

  for (const test of testCases) {
    const result = slugify(test.input)
    const status = result === test.expected ? '✓' : '✗'
    console.log(`  ${status} "${test.input}" -> "${result}" (expected: "${test.expected}")`)
  }

  // Test 2: Check if categories table has new columns
  console.log('\nTest 2: Check categories table schema')
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .limit(1)

    if (error) {
      console.log(`  ✗ Error querying categories: ${error.message}`)
      return
    }

    if (data && data.length > 0) {
      const cat = data[0] as Record<string, any>
      const hasParentId = 'parent_id' in cat
      const hasAutoCreated = 'is_auto_created' in cat

      console.log(`  ${hasParentId ? '✓' : '✗'} parent_id column: ${hasParentId ? 'exists' : 'missing'}`)
      console.log(`  ${hasAutoCreated ? '✓' : '✗'} is_auto_created column: ${hasAutoCreated ? 'exists' : 'missing'}`)
    }
  } catch (error) {
    console.log(`  ✗ Error: ${(error as Error).message}`)
  }

  // Test 3: Test category lookup (case-insensitive)
  console.log('\nTest 3: Test case-insensitive category lookup')
  try {
    const { data, error } = await supabase
      .from('categories')
      .select('id, name')
      .ilike('name', '%Elektrika%')
      .eq('is_active', true)
      .limit(1)

    if (error) {
      console.log(`  ✗ Error: ${error.message}`)
    } else {
      console.log(`  ✓ Found ${data?.length || 0} matching categories`)
      if (data && data.length > 0) {
        console.log(`    - ${data[0].name}`)
      }
    }
  } catch (error) {
    console.log(`  ✗ Error: ${(error as Error).message}`)
  }

  console.log('\n[Test] Category creation tests completed')
}

testCategoryCreation().catch(console.error)
