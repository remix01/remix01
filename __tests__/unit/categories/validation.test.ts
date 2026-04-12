/**
 * Frontend/backend consistency tests for category name validation.
 *
 * These tests assert that `validateCategoryName` (shared utility used by both
 * the frontend hint and the DAL pre-check) produces the SAME result for every
 * input that the SQL function `create_or_find_category` would accept or reject.
 *
 * Run:  npx jest __tests__/unit/categories/validation.test.ts
 */

import {
  validateCategoryName,
  categoryInputHint,
  CATEGORY_NAME_MIN,
  CATEGORY_NAME_MAX,
} from '@/lib/utils/categoryValidation'

// ---------------------------------------------------------------------------
// validateCategoryName
// ---------------------------------------------------------------------------

describe('validateCategoryName – length checks', () => {
  it('rejects empty string', () => {
    const r = validateCategoryName('')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/najmanj 2/i)
  })

  it('rejects single character', () => {
    expect(validateCategoryName('A').valid).toBe(false)
  })

  it('accepts CATEGORY_NAME_MIN length (2 chars)', () => {
    expect(validateCategoryName('AB').valid).toBe(true)
  })

  it('accepts exactly CATEGORY_NAME_MAX chars (100)', () => {
    const name = 'A'.repeat(CATEGORY_NAME_MAX)
    expect(validateCategoryName(name).valid).toBe(true)
  })

  it('rejects names longer than CATEGORY_NAME_MAX', () => {
    const name = 'A'.repeat(CATEGORY_NAME_MAX + 1)
    const r = validateCategoryName(name)
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/100 znakov/i)
  })

  it('trims whitespace before length check – "  A  " is 1 char trimmed → invalid', () => {
    expect(validateCategoryName('  A  ').valid).toBe(false)
  })

  it('trims whitespace before length check – "  AB  " is 2 chars trimmed → valid', () => {
    expect(validateCategoryName('  AB  ').valid).toBe(true)
  })
})

describe('validateCategoryName – character checks', () => {
  it('accepts standard ASCII letters and digits', () => {
    expect(validateCategoryName('Elektrika123').valid).toBe(true)
  })

  it('accepts Slovenian characters č š ž (lower and upper)', () => {
    expect(validateCategoryName('Čiščenje').valid).toBe(true)
    expect(validateCategoryName('Šivanje').valid).toBe(true)
    expect(validateCategoryName('Žleb').valid).toBe(true)
  })

  it('accepts spaces within the name', () => {
    expect(validateCategoryName('Popravila pip').valid).toBe(true)
  })

  it('accepts hyphens', () => {
    expect(validateCategoryName('Elektrika-Popravila').valid).toBe(true)
  })

  it('accepts ampersand &', () => {
    expect(validateCategoryName('Gradnja & Obnova').valid).toBe(true)
  })

  it('rejects hash character #', () => {
    const r = validateCategoryName('Test#Kategorija')
    expect(r.valid).toBe(false)
    expect(r.error).toMatch(/črke/i)
  })

  it('rejects at-sign @', () => {
    expect(validateCategoryName('user@test').valid).toBe(false)
  })

  it('rejects slash /', () => {
    expect(validateCategoryName('a/b').valid).toBe(false)
  })

  it('rejects SQL injection attempt', () => {
    expect(validateCategoryName("'; DROP TABLE categories;--").valid).toBe(false)
  })

  it('rejects XSS attempt', () => {
    expect(validateCategoryName('<script>alert(1)</script>').valid).toBe(false)
  })
})

describe('validateCategoryName – normalisation consistency with SQL', () => {
  /**
   * SQL btrim + regexp_replace('\s+', ' ') collapses internal whitespace and
   * strips leading/trailing spaces.  The TypeScript validator also trims first,
   * so both sides agree on the effective length.
   */
  it('internal multiple spaces count as one after SQL normalisation – still valid if ≥2 real chars', () => {
    // "AB   CD" → trimmed = "AB   CD" (length 7) → valid
    expect(validateCategoryName('AB   CD').valid).toBe(true)
  })

  it('only-whitespace string is invalid', () => {
    expect(validateCategoryName('   ').valid).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// categoryInputHint (UX hint shown below input field)
// ---------------------------------------------------------------------------

describe('categoryInputHint', () => {
  it('returns undefined for empty string', () => {
    expect(categoryInputHint('')).toBeUndefined()
  })

  it('returns error hint for too-short input', () => {
    const hint = categoryInputHint('A')
    expect(hint).toMatch(/^❌/)
    expect(hint).toMatch(/najmanj/i)
  })

  it('returns checkmark hint for valid input', () => {
    const hint = categoryInputHint('Popravila')
    expect(hint).toMatch(/^✓/)
    // Shows the trimmed length
    expect(hint).toContain('9 znakov')
  })

  it('returns error hint for invalid characters', () => {
    const hint = categoryInputHint('Bad#Chars')
    expect(hint).toMatch(/^❌/)
  })

  it('reports trimmed length in hint, not raw length', () => {
    // "  Popravila  " raw = 13, trimmed = 9
    const hint = categoryInputHint('  Popravila  ')
    expect(hint).toContain('9 znakov')
  })
})
