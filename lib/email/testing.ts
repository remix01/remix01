/**
 * Testing utilities for email sending
 * Use these in development and tests to verify email logic without sending real emails
 */

import { EmailTemplate } from './basic-templates'

/**
 * Mock result when Resend is not configured
 */
export const MOCK_RESEND_DISABLED = {
  success: false,
  error: 'Email service not configured - check RESEND_API_KEY',
}

/**
 * Mock successful send result
 */
export function mockSuccessfulSend(to: string) {
  return {
    success: true,
    messageId: `mock_${Date.now()}_${Math.random().toString(36).substring(7)}`,
    to,
  }
}

/**
 * Mock batch send results
 */
export function mockSuccessfulBatchSend(count: number) {
  return {
    success: true,
    messageIds: Array.from({ length: count }, (_, i) =>
      `mock_${Date.now()}_${i}`
    ),
  }
}

/**
 * Validate email address format
 */
export function isValidEmailFormat(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate email template
 */
export function validateTemplate(template: EmailTemplate): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (!template.subject || template.subject.trim().length === 0) {
    errors.push('Template missing subject')
  }

  if (!template.html && !template.text) {
    errors.push('Template must have either html or text content')
  }

  if (template.subject && template.subject.length > 100) {
    errors.push(`Subject too long (${template.subject.length}/100 chars)`)
  }

  if (
    template.html &&
    template.html.length > 1024 * 1024 // 1MB limit
  ) {
    errors.push(
      `HTML content too large (${template.html.length} bytes, max 1MB)`
    )
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}

/**
 * Test email sending with logging
 * Useful for development and debugging
 */
export async function testEmailSending() {
  console.log('\n🧪 Email Service Test\n')

  // Check API key
  const hasApiKey = !!process.env.RESEND_API_KEY
  console.log(
    `✓ RESEND_API_KEY configured: ${hasApiKey ? '✅ YES' : '❌ NO'}`
  )

  // Check required env vars
  const requiredVars = {
    'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL,
    'RESEND_FROM': process.env.RESEND_FROM,
  }

  console.log('\nEnvironment Variables:')
  Object.entries(requiredVars).forEach(([key, value]) => {
    console.log(
      `  ${key}: ${value ? '✅ set' : '⚠️  not set'}`
    )
  })

  // Test template validation
  console.log('\n📧 Template Validation:')

  const goodTemplate = {
    subject: 'Test Email',
    html: '<p>Test content</p>',
  }

  const validation = validateTemplate(goodTemplate)
  console.log(
    `  Valid template: ${validation.valid ? '✅ PASS' : '❌ FAIL'}`
  )

  if (!validation.valid) {
    validation.errors.forEach((error) => console.log(`    - ${error}`))
  }

  // Test email validation
  console.log('\n📬 Email Validation:')

  const testEmails = [
    { email: 'valid@example.com', expected: true },
    { email: 'invalid.email', expected: false },
    { email: 'test@domain.co.uk', expected: true },
    { email: '@invalid.com', expected: false },
  ]

  testEmails.forEach(({ email, expected }) => {
    const isValid = isValidEmailFormat(email)
    const result = isValid === expected ? '✅' : '❌'
    console.log(`  ${result} ${email}: ${isValid ? 'valid' : 'invalid'}`)
  })

  // Recommendations
  console.log('\n💡 Recommendations:')

  if (!hasApiKey) {
    console.log(
      '  1. Set RESEND_API_KEY in your environment variables'
    )
    console.log('  2. Get your API key from https://resend.com/api-keys')
    console.log(
      '  3. Verify your domain in Resend dashboard'
    )
  }

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    console.log(
      '  - Set NEXT_PUBLIC_APP_URL for email links to work correctly'
    )
  }

  console.log('\n✨ Test complete!\n')
}

/**
 * Log email for debugging in development
 */
export function logEmailDebug(
  to: string | string[],
  subject: string,
  html?: string
) {
  const toArray = Array.isArray(to) ? to : [to]

  console.log(
    '\n' +
    '═'.repeat(70) +
    '\n' +
    '📧 EMAIL DEBUG\n' +
    '═'.repeat(70)
  )

  console.log(`To: ${toArray.join(', ')}`)
  console.log(`Subject: ${subject}`)

  if (html) {
    // Strip HTML tags for preview
    const preview = html
      .replace(/<[^>]*>/g, '')
      .substring(0, 200)
      .trim()
    console.log(`\nPreview:\n${preview}...`)
  }

  console.log(
    '═'.repeat(70) + '\n'
  )
}

/**
 * Generate test email data
 */
export const TEST_DATA = {
  users: [
    {
      email: 'customer@example.com',
      name: 'John Customer',
      id: 'user-1',
    },
    {
      email: 'provider@example.com',
      name: 'Jane Provider',
      id: 'user-2',
    },
  ],
  jobs: [
    {
      id: 'job-1',
      title: 'Plumbing Repair',
      description: 'Fix leaking kitchen sink',
    },
    {
      id: 'job-2',
      title: 'Electrical Installation',
      description: 'Install new light fixtures',
    },
  ],
  payments: [
    {
      id: 'payment-1',
      amount: 150,
      status: 'completed',
    },
    {
      id: 'payment-2',
      amount: 250,
      status: 'failed',
    },
  ],
}

/**
 * Create a test email payload
 */
export function createTestEmailPayload(type: 'single' | 'batch' = 'single') {
  if (type === 'single') {
    return {
      to: TEST_DATA.users[0].email,
      subject: 'Test Email - Single',
      html: '<h1>Test Email</h1><p>This is a test email sent from LiftGO.</p>',
      eventType: 'test-email',
      entityId: `test-${Date.now()}`,
    }
  } else {
    return {
      emails: [
        {
          to: TEST_DATA.users[0].email,
          subject: 'Test Email #1',
          html: '<p>Test email 1</p>',
        },
        {
          to: TEST_DATA.users[1].email,
          subject: 'Test Email #2',
          html: '<p>Test email 2</p>',
        },
      ],
      eventType: 'test-batch',
      batchId: `test-batch-${Date.now()}`,
    }
  }
}

/**
 * Email send result logger
 */
export function logEmailResult(
  result: { success: boolean; messageId?: string; error?: string },
  context?: string
) {
  if (result.success) {
    console.log(
      `✅ Email sent successfully${context ? ` (${context})` : ''}`,
      {
        messageId: result.messageId,
      }
    )
  } else {
    console.error(
      `❌ Email failed${context ? ` (${context})` : ''}`,
      {
        error: result.error,
      }
    )
  }
}
