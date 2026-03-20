/**
 * Generate a unique referral code for a user
 * Format: LIFTGO_XXXXX (12 characters total)
 * Example: LIFTGO_K9M2R
 */
export function generateReferralCode(): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = 'LIFTGO_'
  
  for (let i = 0; i < 6; i++) {
    code += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  
  return code
}

/**
 * Validate referral code format
 */
export function isValidReferralCode(code: string): boolean {
  return /^LIFTGO_[A-Z0-9]{6}$/.test(code)
}

/**
 * Extract partner ID from referral link
 */
export function parseReferralLink(url: string): string | null {
  try {
    const urlObj = new URL(url)
    const ref = urlObj.searchParams.get('ref') || urlObj.searchParams.get('referral')
    return ref && isValidReferralCode(ref) ? ref : null
  } catch {
    return null
  }
}

/**
 * Generate referral link for partner
 */
export function generateReferralLink(referralCode: string, baseUrl: string = ''): string {
  const domain = baseUrl || (typeof window !== 'undefined' ? window.location.origin : 'https://liftgo.net')
  return `${domain}/registracija-mojster?ref=${referralCode}`
}
