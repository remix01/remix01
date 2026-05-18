/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^server-only$': '<rootDir>/__tests__/helpers/server-only.mock.js',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '<rootDir>/.claude/worktrees/',
    '<rootDir>/resend-mcp/',
  ],
  testMatch: [
    '**/__tests__/**/*.test.[jt]s?(x)',
    '**/__tests__/**/*.contract.test.[jt]s?(x)',
    '**/*.test.[jt]s?(x)',
  ],
  transformIgnorePatterns: [
    '/node_modules/.pnpm/(?!(uuid|@supabase))',
    '/node_modules/(?!(\\.pnpm|uuid|@supabase))',
  ],
  globals: {
    crypto: require('crypto'),
  },
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup-jest.ts'],
}
