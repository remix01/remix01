import fs from 'fs/promises'
import path from 'path'
import type { TestWritingResult } from './codexTestWriter'

export async function persistGeneratedTests(result: TestWritingResult, rootDir = process.cwd()): Promise<string> {
  if (!result.testFilePath?.trim()) {
    throw new Error('testFilePath is required')
  }

  const absolutePath = path.resolve(rootDir, result.testFilePath)
  const rel = path.relative(rootDir, absolutePath)
  const normalizedRel = rel.replace(/\\/g, '/')

  if (normalizedRel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(`Refusing to write outside project root: ${result.testFilePath}`)
  }

  const isTestFile = /\.(test|spec)\.(c|m)?[jt]sx?$/i.test(path.basename(absolutePath))
  if (!isTestFile) {
    throw new Error(`Refusing to write non-test target: ${result.testFilePath}`)
  }

  const existing = await fs.stat(absolutePath).catch(() => null)
  if (existing?.isDirectory()) {
    throw new Error(`Refusing to overwrite directory target: ${result.testFilePath}`)
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true })
  await fs.writeFile(absolutePath, result.testCode, 'utf-8')
  return absolutePath
}
