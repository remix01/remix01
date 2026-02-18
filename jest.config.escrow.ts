import type { Config } from 'jest'
import nextJest from 'next/jest'

const createJestConfig = nextJest({
  dir: './',
})

const config: Config = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/__tests__/escrow/setup.ts'],
  testMatch: ['**/__tests__/escrow/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'lib/audit.ts',
    'lib/stripe.ts',
    'lib/escrow.ts',
    'lib/loyalty/commissionCalculator.ts',
    'app/api/webhooks/stripe/route.ts',
    'app/api/escrow/**/*.ts',
    'app/api/cron/escrow-auto-release/route.ts',
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80,
    },
  },
  testTimeout: 30000, // 30s for integration tests
}

export default createJestConfig(config)
