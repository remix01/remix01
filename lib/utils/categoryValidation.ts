/**
 * Shared validation rules for category names.
 * Must stay in sync with:
 *   - lib/dal/categories.ts  (TypeScript pre-check)
 *   - supabase/migrations/2026041202_create_or_find_category_rpc.sql  (SQL function)
 *   - app/(narocnik)/novo-povprasevanje/page.tsx  (frontend UX feedback)
 */

export const CATEGORY_NAME_MIN = 2
export const CATEGORY_NAME_MAX = 100

/** Allowed characters: Unicode letters + digits + space + hyphen + ampersand */
export const CATEGORY_NAME_REGEX = /^[a-žA-Ž0-9\s\-&]+$/u

export interface CategoryValidationResult {
  valid: boolean
  /** Slovenian error message, undefined when valid */
  error?: string
}

/**
 * Validate a raw category name string.
 * Trims first so results match the server-side behaviour exactly.
 */
export function validateCategoryName(raw: string): CategoryValidationResult {
  const trimmed = raw.trim()

  if (trimmed.length < CATEGORY_NAME_MIN) {
    return { valid: false, error: 'Kategorija mora imeti najmanj 2 znaka' }
  }
  if (trimmed.length > CATEGORY_NAME_MAX) {
    return { valid: false, error: 'Kategorija ne sme biti daljša od 100 znakov' }
  }
  if (!CATEGORY_NAME_REGEX.test(trimmed)) {
    return {
      valid: false,
      error: 'Kategorija sme vsebovati samo črke, številke, presledke in vezaje',
    }
  }

  return { valid: true }
}

/**
 * Human-readable hint for an in-progress input (shown below the text field).
 * Returns undefined when the field is empty (no hint needed yet).
 */
export function categoryInputHint(raw: string): string | undefined {
  if (!raw) return undefined
  const { valid, error } = validateCategoryName(raw)
  if (!valid) return `❌ ${error}`
  return `✓ ${raw.trim().length} znakov`
}
