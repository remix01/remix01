/**
 * Slugify utility for generating URL-safe slugs from category names
 * Handles Slovenian characters and special characters
 */

/**
 * Convert a category name to a URL-safe slug
 * Supports Slovenian characters (č, š, ž)
 * 
 * @example
 * slugify('Elektrika - Popravila') // => 'elektrika-popravila'
 * slugify('Gradbeništvo & Gradbene Storitve') // => 'gradbenistvo-gradbene-storitve'
 * slugify('Čiščenje') // => 'ciscenje'
 */
export function slugify(text: string): string {
  if (!text) return ''

  // Slovenian character mappings
  const slovenianMap: Record<string, string> = {
    č: 'c',
    š: 's',
    ž: 'z',
  }

  let slug = text.toLowerCase()

  // Replace Slovenian characters
  for (const [char, replacement] of Object.entries(slovenianMap)) {
    slug = slug.replace(new RegExp(char, 'g'), replacement)
  }

  // Replace non-alphanumeric characters with hyphens
  slug = slug.replace(/[^a-z0-9]+/g, '-')

  // Remove leading/trailing hyphens
  slug = slug.replace(/^-+|-+$/g, '')

  // Collapse multiple consecutive hyphens
  slug = slug.replace(/-+/g, '-')

  return slug
}

/**
 * Generate a unique slug by appending a number if necessary
 * Useful when the base slug already exists
 * 
 * @example
 * uniqueSlug('plumbing', 'plumbing-repairs', 'plumbing')
 * // => 'plumbing-1'
 */
export function makeUniqueSlug(baseSlug: string, suffix: string = '', counter: number = 0): string {
  if (counter === 0) {
    return baseSlug
  }
  return `${baseSlug}-${counter}`
}
