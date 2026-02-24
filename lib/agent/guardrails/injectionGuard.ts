/**
 * Injection Guard - Detects and blocks SQL injection, prompt injection, script injection
 * Scans all parameter values for malicious patterns
 */

// Patterns to detect
const INJECTION_PATTERNS = {
  // SQL injection keywords
  sql: /\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|EXEC|EXECUTE|--|\/\*|\*\/)\b/gi,

  // Prompt injection attempts
  prompt: /ignore\s+(previous|all|prior).*?instructions?|you\s+are\s+now|jailbreak|bypass|exploit|system\s+prompt|override|unveil|internal|secret/gi,

  // Script injection patterns
  script: /<script[^>]*>.*?<\/script>|javascript:|onerror\s*=|onload\s*=|eval\s*\(|Function\s*\(|document\.|window\./gi,

  // Command injection
  command: /[;&|`$(){}[\]<>\\]/g,
}

/**
 * Recursively scan an object for injection patterns
 * Returns array of found patterns, empty if clean
 */
function findInjectionPatterns(obj: unknown, path: string = 'root'): Array<{ path: string; pattern: string }> {
  const results: Array<{ path: string; pattern: string }> = []

  if (typeof obj === 'string') {
    // Check each pattern type
    for (const [type, regex] of Object.entries(INJECTION_PATTERNS)) {
      const matches = obj.match(regex)
      if (matches && matches.length > 0) {
        results.push({
          path,
          pattern: `${type}: ${matches[0]}`,
        })
      }
    }
  } else if (typeof obj === 'object' && obj !== null) {
    // Recurse into object/array
    for (const [key, value] of Object.entries(obj)) {
      const newPath = `${path}.${key}`
      results.push(...findInjectionPatterns(value, newPath))
    }
  }

  return results
}

/**
 * Check parameters for injection attempts
 * Throws 400 if any injection patterns detected
 */
export async function injectionGuard(params: unknown): Promise<void> {
  const findings = findInjectionPatterns(params)

  if (findings.length > 0) {
    const details = findings.map((f) => `${f.path}: ${f.pattern}`).join('; ')
    throw {
      success: false,
      error: `Suspicious input detected. Please check your request.`,
      code: 400,
    }
  }
}
