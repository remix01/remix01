import { ViolationType, ViolationSeverity } from '@prisma/client'

// Detection patterns for contact information and bypass attempts
export const DETECTION_PATTERNS = [
  {
    name: 'Slovenian Mobile',
    pattern: /(\+386|00386|0)(31|40|41|51|64|68|70)[\s\-]?[\d\s\-]{6,7}/g,
    type: ViolationType.PHONE_DETECTED,
    severity: ViolationSeverity.HIGH,
  },
  {
    name: 'Croatian Phone',
    pattern: /(\+385|00385|0[12345678])[\s\-]?[\d\s\-]{5,8}/g,
    type: ViolationType.PHONE_DETECTED,
    severity: ViolationSeverity.HIGH,
  },
  {
    name: 'Generic Phone',
    pattern: /\b\d{3}[\s.\-]?\d{3}[\s.\-]?\d{3,4}\b/g,
    type: ViolationType.PHONE_DETECTED,
    severity: ViolationSeverity.MEDIUM,
  },
  {
    name: 'Email Address',
    pattern: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,
    type: ViolationType.EMAIL_DETECTED,
    severity: ViolationSeverity.HIGH,
  },
  {
    name: 'Messaging Platforms',
    pattern: /(whatsapp|viber|signal|telegram|wa\.me)[\s:\/]+[\w+\-@.]{4,}/gi,
    type: ViolationType.BYPASS_ATTEMPT,
    severity: ViolationSeverity.CRITICAL,
  },
  {
    name: 'Call Me Phrases (Slovenian)',
    pattern: /(poklič|kliči|napi(š|si)|kontaktiraj|doseg(i|ljiv)|piši).{0,30}(\d{5,}|@)/gi,
    type: ViolationType.BYPASS_ATTEMPT,
    severity: ViolationSeverity.HIGH,
  },
  {
    name: 'Bypass Keywords (Slovenian)',
    pattern: /(brez\s+platforme|direktno|mimo\s+liftgo|ceneje\s+brez|zasebno\s+dogovor)/gi,
    type: ViolationType.SUSPICIOUS_PATTERN,
    severity: ViolationSeverity.CRITICAL,
  },
]

export interface DetectionResult {
  shouldBlock: boolean
  violationType: ViolationType | null
  severity: ViolationSeverity
  detectedItems: string[]
  redactedBody: string
}

/**
 * Analyzes message content for contact information and bypass attempts.
 * Returns detection result with blocking recommendation and redacted content.
 */
export function analyzeMessage(body: string): DetectionResult {
  const detectedItems: string[] = []
  let highestSeverity: ViolationSeverity = ViolationSeverity.LOW
  let primaryViolationType: ViolationType | null = null
  let redactedBody = body

  // Check each pattern
  for (const { pattern, type, severity } of DETECTION_PATTERNS) {
    const matches = body.match(pattern)
    
    if (matches && matches.length > 0) {
      // Store detected items
      detectedItems.push(...matches)
      
      // Update violation type and severity
      if (!primaryViolationType || compareSeverity(severity, highestSeverity) > 0) {
        primaryViolationType = type
        highestSeverity = severity
      }
      
      // Redact matched content
      redactedBody = redactedBody.replace(pattern, '[SKRITO]')
    }
  }

  // Determine if message should be blocked
  const shouldBlock = detectedItems.length > 0 && (
    highestSeverity === ViolationSeverity.HIGH ||
    highestSeverity === ViolationSeverity.CRITICAL
  )

  return {
    shouldBlock,
    violationType: primaryViolationType,
    severity: highestSeverity,
    detectedItems,
    redactedBody,
  }
}

/**
 * Compares two severity levels. Returns:
 * - Positive number if a > b
 * - Negative number if a < b
 * - Zero if equal
 */
function compareSeverity(a: ViolationSeverity, b: ViolationSeverity): number {
  const severityOrder = {
    [ViolationSeverity.LOW]: 1,
    [ViolationSeverity.MEDIUM]: 2,
    [ViolationSeverity.HIGH]: 3,
    [ViolationSeverity.CRITICAL]: 4,
  }
  
  return severityOrder[a] - severityOrder[b]
}

/**
 * Generates a user-friendly explanation for why a message was blocked.
 */
export function getBlockedReasonMessage(violationType: ViolationType): string {
  switch (violationType) {
    case ViolationType.PHONE_DETECTED:
      return 'Telefonska številka zaznana'
    case ViolationType.EMAIL_DETECTED:
      return 'E-poštni naslov zaznan'
    case ViolationType.BYPASS_ATTEMPT:
      return 'Poskus izogibanja platformi'
    case ViolationType.SUSPICIOUS_PATTERN:
      return 'Sumljiv vzorec zaznan'
    default:
      return 'Kršitev pravilnika'
  }
}
