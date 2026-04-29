import { jest } from '@jest/globals'

;(globalThis as any).vi = {
  fn: jest.fn.bind(jest),
  mock: jest.mock.bind(jest),
  clearAllMocks: jest.clearAllMocks.bind(jest),
}
