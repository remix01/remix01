const nextJest = require('next/jest')

const createJestConfig = nextJest({ dir: './' })

/** @type {import('jest').Config} */
const config = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/__tests__/marketplace/setup.ts'],
  testMatch: ['**/__tests__/marketplace/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    // uuid v11+ ships ESM-only — shim to crypto.randomUUID for Jest (CommonJS)
    '^uuid$': '<rootDir>/__tests__/marketplace/helpers/uuidShim.ts',
  },
  testTimeout: 30000,
}

module.exports = createJestConfig(config)
